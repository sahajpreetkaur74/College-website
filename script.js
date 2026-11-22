// This one file is used by every page. Each block first checks that the
// element exists on the current page, so nothing breaks on pages without it.

// ---------- 1. MOBILE MENU ----------
const menuBtn = document.getElementById("menu-btn");
const nav = document.getElementById("nav");
menuBtn.addEventListener("click", function () { nav.classList.toggle("open"); });

// ---------- 2. DARK MODE ----------
// The choice is saved in the browser (localStorage) so it is remembered.
const themeBtn = document.getElementById("theme-btn");

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === "dark" ? "Light" : "Dark";
  try { localStorage.setItem("theme", theme); } catch (e) { /* storage not available */ }
}
let savedTheme = "light";
try { savedTheme = localStorage.getItem("theme") || "light"; } catch (e) {}
setTheme(savedTheme);

themeBtn.addEventListener("click", function () {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

// ---------- 3. ANNOUNCEMENT BAR ----------
document.getElementById("announce-close").addEventListener("click", function () {
  document.getElementById("announce").classList.add("gone");
});

// ---------- 4. COUNTING NUMBERS (home page) ----------
const counters = document.querySelectorAll("[data-target]");

function startCounting(counter) {
  const target = Number(counter.dataset.target);
  let current = 0;
  const step = Math.ceil(target / 60);
  const timer = setInterval(function () {
    current = current + step;
    if (current >= target) { current = target; clearInterval(timer); }
    counter.textContent = current.toLocaleString();
  }, 25);
}

// IntersectionObserver tells us when an element scrolls into view
const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) { startCounting(entry.target); observer.unobserve(entry.target); }
  });
});
counters.forEach(function (counter) { observer.observe(counter); });

// ---------- 5. COURSE FILTER (courses page) ----------
const filterButtons = document.querySelectorAll(".filter");
const courseCards = document.querySelectorAll("#course-list .card");

filterButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    filterButtons.forEach(function (b) { b.classList.remove("active"); });
    button.classList.add("active");
    const choice = button.dataset.filter;
    courseCards.forEach(function (card) {
      const matches = choice === "all" || card.dataset.category === choice;
      card.classList.toggle("hidden", !matches);
    });
  });
});

// ---------- 7. GALLERY LIGHTBOX (gallery page) ----------
const lightbox = document.getElementById("lightbox");
if (lightbox) {
  document.querySelectorAll(".gallery-img").forEach(function (img) {
    img.addEventListener("click", function () {
      document.getElementById("lightbox-img").src = img.src;
      document.getElementById("lightbox-img").alt = img.alt;
      document.getElementById("lightbox-cap").textContent = img.dataset.caption;
      lightbox.classList.add("open");
    });
  });
  lightbox.addEventListener("click", function () { lightbox.classList.remove("open"); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { lightbox.classList.remove("open"); }
  });
}

// ---------- 8. BACK-TO-TOP BUTTON ----------
const toTop = document.getElementById("to-top");
toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
window.addEventListener("scroll", function () { toTop.classList.toggle("show", window.scrollY > 400); });

// =====================================================================
// FORMS: register, login, feedback, contact, admissions, dashboard.
// Each form checks the input in the browser first, then sends it to the
// Python backend (app.py) using fetch(). The server checks it again and
// saves it in the MySQL database.
// =====================================================================

// ---------- helpers ----------
// Shows (or clears) the red message under one field. Returns true if no error.
function showError(form, name, message) {
  const box = form.querySelector('[data-field="' + name + '"]');
  if (box) {
    box.querySelector(".err").textContent = message;
    box.classList.toggle("invalid", message !== "");
  }
  return message === "";
}
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sends data to the server as JSON and returns the server's answer.
// If there is no server (for example you just opened index.html), it uses
// localApi() below, so every form still works.
// "async/await" means: wait here for the server to reply, then continue.
async function postJSON(url, data) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return localApi(url, data);   // no server found, so use backup mode (saves in the browser)
  }
}

// =====================================================================
// BACKUP MODE (no server needed)
// If no backend is running, the forms save their data in the browser
// (localStorage) instead. This lets the site work by just opening index.html.
// DEMO ONLY: data stays on this computer, and demoHash is a simple scramble,
// NOT real security. A real site uses a server and a proper password hash.
// =====================================================================
function localGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
}
function localSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
}
function demoHash(text) {
  let h = 5381;
  for (const ch of String(text)) { h = (h * 33) ^ ch.charCodeAt(0); }
  return String(h >>> 0);
}
function localApi(url, data) {
  const note = " (Demo mode: saved in this browser only.)";
  const students = localGet("students", []);
  const email = String(data.email || "").toLowerCase();

  if (url === "/api/register") {
    if (students.some(function (s) { return s.email === email; })) {
      return { ok: false, errors: { email: "This email is already registered. Please log in." }, message: "Please fix the highlighted fields." };
    }
    const regNo = "RIT" + new Date().getFullYear() + "-" + String(students.length + 1).padStart(4, "0");
    students.push({
      reg_no: regNo, full_name: data.fullname, dob: data.dob, gender: data.gender, email: email,
      phone: data.phone, course: data.course, marks: Number(data.marks), address: data.address,
      hash: demoHash(data.password)
    });
    localSet("students", students);
    return { ok: true, reg_no: regNo, message: "Registration successful." + note };
  }

  if (url === "/api/login") {
    const student = students.find(function (s) { return s.email === email && s.hash === demoHash(data.password); });
    if (!student) { return { ok: false, message: "Email or password is wrong, or you have not registered yet." }; }
    try { sessionStorage.setItem("loggedIn", email); } catch (e) {}
    return { ok: true, name: student.full_name, reg_no: student.reg_no };
  }

  if (url === "/api/logout") {
    try { sessionStorage.removeItem("loggedIn"); } catch (e) {}
    return { ok: true };
  }

  if (url === "/api/me") {
    let who = null;
    try { who = sessionStorage.getItem("loggedIn"); } catch (e) {}
    const student = students.find(function (s) { return s.email === who; });
    if (!student) { return { ok: false, message: "Not logged in." }; }
    const copy = Object.assign({}, student);
    delete copy.hash;                       // never show the password hash
    return { ok: true, student: copy };
  }

  // contact, enquiry and feedback: keep a copy of what was sent
  const saved = {
    "/api/contact":  ["contact_messages", "We will reply soon."],
    "/api/enquiry":  ["enquiries", "Our admissions team will contact you."],
    "/api/feedback": ["feedback", "Your feedback was received."]
  };
  if (saved[url]) {
    const list = localGet(saved[url][0], []);
    list.push(data);
    localSet(saved[url][0], list);
    return { ok: true, message: "Thank you, " + data.name + ". " + saved[url][1] + note };
  }
  return { ok: false, message: "Unknown request." };
}

// Asks "who is logged in?" (server first, backup mode if there is no server)
async function getMe() {
  try {
    const response = await fetch("/api/me");
    return await response.json();           // a 401 answer is {ok: false}
  } catch (error) {
    return localApi("/api/me", {});
  }
}

// Shows the errors that the SERVER sent back, under the matching fields.
function showServerErrors(form, errors) {
  Object.keys(errors).forEach(function (name) { showError(form, name, errors[name]); });
}

// "Show password" checkboxes
document.querySelectorAll(".show-pass").forEach(function (box) {
  box.addEventListener("change", function () {
    box.closest("form").querySelectorAll('input[name="password"], input[name="confirm"]').forEach(function (input) {
      input.type = box.checked ? "text" : "password";
    });
  });
});

// ---------- CONTACT + ADMISSIONS ENQUIRY (forms with class "check-form") ----------
// The URL to send to is written in the HTML: data-endpoint="/api/contact"
document.querySelectorAll(".check-form").forEach(function (form) {
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const msg = form.querySelector(".form-msg");
    const email = form.querySelector('input[type="email"]');
    let anyEmpty = false;
    form.querySelectorAll("input, textarea, select").forEach(function (f) {
      if (f.value.trim() === "") { anyEmpty = true; }
    });

    if (anyEmpty) {
      msg.textContent = "Please fill in all fields.";
      msg.className = "form-msg error";
    } else if (!emailPattern.test(email.value.trim())) {
      msg.textContent = "Please enter a valid email address.";
      msg.className = "form-msg error";
    } else {
      msg.textContent = "Sending...";
      msg.className = "form-msg";
      const data = Object.fromEntries(new FormData(form));   // collects fields by their name
      const result = await postJSON(form.dataset.endpoint, data);
      if (result.ok) {
        msg.textContent = result.message;
        msg.className = "form-msg ok";
        form.reset();
      } else {
        msg.textContent = result.errors ? Object.values(result.errors)[0] : result.message;
        msg.className = "form-msg error";
      }
    }
  });
});

// ---------- REGISTRATION ----------
const regForm = document.getElementById("reg-form");
if (regForm) {
  regForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const f = regForm.elements;           // lets us read fields by their name
    const formMsg = regForm.querySelector(".form-msg");
    let ok = true;
    function check(name, message) { if (!showError(regForm, name, message)) { ok = false; } }

    const fullname = f.fullname.value.trim();
    check("fullname", /^[A-Za-z .]{3,}$/.test(fullname) ? "" : "Enter your full name (letters only, at least 3).");

    let dobMessage = "";
    if (f.dob.value === "") { dobMessage = "Choose your date of birth."; }
    else {
      const age = (Date.now() - new Date(f.dob.value)) / (365.25 * 24 * 3600 * 1000);
      if (age < 16 || age > 60) { dobMessage = "Age must be between 16 and 60."; }
    }
    check("dob", dobMessage);

    check("gender", f.gender.value ? "" : "Select one option.");
    check("email", emailPattern.test(f.email.value.trim()) ? "" : "Enter a valid email address.");
    check("phone", /^[6-9]\d{9}$/.test(f.phone.value.trim()) ? "" : "Enter a 10-digit mobile number.");
    check("course", f.course.value ? "" : "Choose a course.");

    const marks = Number(f.marks.value);
    check("marks", f.marks.value !== "" && marks >= 33 && marks <= 100 ? "" : "Enter a percentage between 33 and 100.");
    check("address", f.address.value.trim().length >= 10 ? "" : "Enter your full address (at least 10 characters).");

    const pass = f.password.value;
    check("password", pass.length >= 8 && /[A-Za-z]/.test(pass) && /\d/.test(pass) ? "" : "Use at least 8 characters with a letter and a number.");
    check("confirm", f.confirm.value === pass && pass !== "" ? "" : "Passwords do not match.");
    check("terms", f.terms.checked ? "" : "Please tick the box to continue.");

    if (!ok) { return; }   // stop here if any check failed

    // everything looks fine, so send it to the server
    const data = {
      fullname: fullname, dob: f.dob.value, gender: f.gender.value, email: f.email.value.trim(),
      phone: f.phone.value.trim(), course: f.course.value, marks: f.marks.value,
      address: f.address.value.trim(), password: pass, confirm: f.confirm.value
    };
    const button = regForm.querySelector('button[type="submit"]');
    button.disabled = true;
    formMsg.textContent = "Saving...";
    formMsg.className = "form-msg";
    const result = await postJSON("/api/register", data);
    button.disabled = false;

    if (!result.ok) {
      if (result.errors) { showServerErrors(regForm, result.errors); }
      formMsg.textContent = result.message || "";
      formMsg.className = "form-msg error";
      return;
    }

    formMsg.textContent = "";
    const box = document.getElementById("reg-success");
    box.innerHTML = "<h2>Registration successful</h2><p></p><p></p>";
    box.children[1].textContent = "Welcome, " + fullname + ". Course: " + data.course + ".";
    box.children[2].textContent = "Your registration number is " + result.reg_no + ". Keep it safe.";
    box.hidden = false;
    regForm.reset();
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

// ---------- LOGIN ----------
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const msg = loginForm.querySelector(".form-msg");
    const email = loginForm.elements.email.value.trim();
    const pass = loginForm.elements.password.value;

    const e1 = showError(loginForm, "email", emailPattern.test(email) ? "" : "Enter a valid email address.");
    const e2 = showError(loginForm, "password", pass !== "" ? "" : "Enter your password.");
    if (!e1 || !e2) { msg.textContent = ""; return; }

    msg.textContent = "Checking...";
    msg.className = "form-msg";
    const result = await postJSON("/api/login", { email: email, password: pass });
    if (result.ok) {
      window.location.href = "dashboard.html";   // go to the student's account page
    } else {
      msg.textContent = result.message;
      msg.className = "form-msg error";
    }
  });
}

// ---------- FEEDBACK ----------
const feedbackForm = document.getElementById("feedback-form");
if (feedbackForm) {
  feedbackForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const f = feedbackForm.elements;
    const msg = feedbackForm.querySelector(".form-msg");
    const results = [
      showError(feedbackForm, "name", f.name.value.trim().length >= 2 ? "" : "Enter your name."),
      showError(feedbackForm, "category", f.category.value ? "" : "Choose a topic."),
      showError(feedbackForm, "rating", f.rating.value ? "" : "Pick a rating from 1 to 5."),
      showError(feedbackForm, "comments", f.comments.value.trim().length >= 10 ? "" : "Write at least 10 characters.")
    ];
    if (results.includes(false)) { msg.textContent = ""; return; }

    const result = await postJSON("/api/feedback", {
      name: f.name.value.trim(), category: f.category.value,
      rating: f.rating.value, comments: f.comments.value.trim()
    });
    if (result.ok) {
      msg.textContent = result.message;
      msg.className = "form-msg ok";
      feedbackForm.reset();
    } else {
      if (result.errors) { showServerErrors(feedbackForm, result.errors); }
      msg.textContent = result.message || "";
      msg.className = "form-msg error";
    }
  });
}

// ---------- DASHBOARD (dashboard.html) ----------
// Asks the server "who is logged in?" and shows that student's details.
const dash = document.getElementById("dash");
if (dash) {
  loadDashboard();
}
async function loadDashboard() {
  try {
    const result = await getMe();
    if (!result.ok) { window.location.href = "login.html"; return; }
    const s = result.student;

    dash.innerHTML = "<h2></h2><div class='table-wrap'><table></table></div><button class='btn' id='logout-btn'>Log out</button>";
    dash.querySelector("h2").textContent = "Welcome, " + s.full_name;
    const table = dash.querySelector("table");
    [["Registration number", s.reg_no], ["Email", s.email], ["Mobile", s.phone], ["Course", s.course],
     ["Date of birth", s.dob], ["12th percentage", s.marks + "%"], ["Address", s.address]
    ].forEach(function (pair) {
      const row = table.insertRow();
      const th = document.createElement("th");
      th.textContent = pair[0];
      row.appendChild(th);
      row.insertCell().textContent = pair[1];
    });

    document.getElementById("logout-btn").addEventListener("click", async function () {
      await postJSON("/api/logout", {});
      window.location.href = "login.html";
    });
  } catch (error) {
    dash.textContent = "Cannot reach the server. Start the backend with 'python app.py' and open http://localhost:5000";
  }
}

// =====================================================================
// SCROLL ANIMATION: cards, headings and list items fade up when they
// scroll into view. The .reveal class is added here (not in the HTML),
// so if JavaScript fails the content is still visible.
// =====================================================================
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealItems = document.querySelectorAll(
    ".section h2, .card, .events li, .gallery figure, .stats-grid, .timeline li, .steps li, details, .table-wrap, .photo:not(.round), .form-card"
  );
  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) { return; }
      const el = entry.target;
      // small delay for each item in a row, so they appear one after another
      const position = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.style.transitionDelay = (position % 4) * 80 + "ms";
      el.classList.add("visible");
      revealObserver.unobserve(el);
      // after the animation, remove the helper classes so hover effects work normally
      setTimeout(function () {
        el.classList.remove("reveal", "visible");
        el.style.transitionDelay = "";
      }, 900);
    });
  }, { threshold: 0.12 });

  revealItems.forEach(function (el) {
    el.classList.add("reveal");
    revealObserver.observe(el);
  });
}
