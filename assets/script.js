/* ==========================================================================
   JAM BEAUTY CO. — INTERACTIVE SCRIPT
   ========================================================================== */
(() => {
    "use strict";

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const peso = n => "₱" + n.toLocaleString("en-PH");

    /* ---------- Product data ---------- */
    const PRODUCTS = {
        cleanser: {
            name: "Facial Cleanser", price: 250, tag: "Best Seller", size: "Net Wt. 100ml",
            img: "assets/images/cleanser.jpg", webp: "assets/images/cleanser.webp",
            desc: "A daily cleansing essential formulated to remove impurities without stripping essential moisture. Cleanse • Refresh • Glow.",
            benefits: [
                ["fa-droplet", "Removes dirt & oil"],
                ["fa-leaf", "Keeps skin moisturized"],
                ["fa-sparkles", "For a fresh & glowing skin"]
            ],
            extra: [["Good for", ["Deep cleansing", "Moisturizing formula", "All skin types"]]],
            step: "Step 1 · Cleanse"
        },
        serum: {
            name: "Facial Serum", price: 350, tag: "Glow Booster", size: "Net 30ml",
            img: "assets/images/serum.jpg", webp: "assets/images/serum.webp",
            desc: "Concentrated serum infused with hydrating ingredients for supple and bright skin. Brighten • Hydrate • Repair.",
            benefits: [
                ["fa-sparkles", "Brightens skin tone"],
                ["fa-droplet", "Deeply hydrates"],
                ["fa-face-smile", "Smooths skin texture"],
                ["fa-shield-heart", "Strengthens skin barrier"]
            ],
            extra: [["Key ingredients", ["Hyaluronic Acid", "Niacinamide", "Vitamin C"]]],
            step: "Step 2 · Treat"
        },
        liptint: {
            name: "Lip Tint", price: 180, tag: "Must Have", size: "Net Wt. 5ml",
            img: "assets/images/liptint.jpg", webp: "assets/images/liptint.webp",
            desc: "Easy-to-apply stain formulation for a fresh, effortless everyday blush & lip tint look. Natural • Long-lasting • Lightweight.",
            benefits: [
                ["fa-heart", "Adds a natural flush"],
                ["fa-droplet", "Keeps lips moisturized"],
                ["fa-sparkles", "Long-lasting color"]
            ],
            extra: [["Shades", ["Cherry Blush", "Rosy Pink", "Berry Red"]]],
            step: "Step 3 · Finish"
        }
    };
    const ORDER = ["cleanser", "serum", "liptint"];

    /* ---------- Routine state (persisted) ---------- */
    const selected = { cleanser: false, serum: false, liptint: false };
    try {
        const saved = JSON.parse(localStorage.getItem("jam-routine") || "{}");
        ORDER.forEach(k => { if (saved[k]) selected[k] = true; });
    } catch (e) {}

    /* ---------- Toast ---------- */
    function toast(msg, icon = "fa-heart") {
        const stack = $("#toastStack");
        const el = document.createElement("div");
        el.className = "toast";
        el.innerHTML = `<i class="fa-solid ${icon}"></i><span></span>`;
        el.lastChild.textContent = msg;
        stack.appendChild(el);
        while (stack.children.length > 3) stack.firstChild.remove();
        setTimeout(() => {
            el.classList.add("out");
            setTimeout(() => el.remove(), 400);
        }, 3200);
    }

    /* ---------- Preloader ---------- */
    function hidePreloader() {
        const p = $("#preloader");
        if (!p || p.classList.contains("done")) return;
        p.classList.add("done");
        document.body.classList.remove("locked");
        startReveals();
    }
    document.body.classList.add("locked");
    window.addEventListener("load", () => setTimeout(hidePreloader, reduceMotion ? 0 : 900));
    setTimeout(hidePreloader, 3500); // safety net if an asset stalls

    /* ---------- Reveal on scroll + counters ---------- */
    let revealsStarted = false;
    function startReveals() {
        if (revealsStarted) return;
        revealsStarted = true;

        const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                e.target.classList.add("in");
                io.unobserve(e.target);
            });
        }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
        $$(".reveal").forEach(el => io.observe(el));

        const cio = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                countUp(e.target);
                cio.unobserve(e.target);
            });
        }, { threshold: 0.6 });
        $$("[data-count]").forEach(el => cio.observe(el));
    }

    function countUp(el) {
        const target = +el.dataset.count;
        const prefix = el.dataset.prefix || "";
        if (reduceMotion) { el.textContent = prefix + target; return; }
        const dur = 1400, t0 = performance.now();
        const tick = now => {
            const p = Math.min((now - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 4);
            el.textContent = prefix + Math.round(target * eased);
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    /* ---------- Theme switcher ---------- */
    const themeDots = $$(".theme-dot");
    function setTheme(theme, silent) {
        themeDots.forEach(d => d.classList.toggle("active", d.dataset.setTheme === theme));
        if (theme === "default") document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme", theme);
        try { localStorage.setItem("jam-theme", theme); } catch (e) {}
        const meta = $('meta[name="theme-color"]');
        if (meta) meta.content = theme === "dark" ? "#140b0e" : theme === "rosegold" ? "#b56c58" : "#c85a75";
        if (!silent) {
            const names = { default: "Blush Pink", rosegold: "Rose Gold", dark: "Pearl Dark" };
            toast(`${names[theme]} theme on`, "fa-palette");
        }
    }
    themeDots.forEach(d => d.addEventListener("click", () => setTheme(d.dataset.setTheme)));
    try { setTheme(localStorage.getItem("jam-theme") || "default", true); } catch (e) {}

    /* ---------- Header: scroll state, progress, back-to-top, scrollspy ---------- */
    const header = $("#siteHeader");
    const progress = $("#scrollProgress");
    const toTop = $("#toTop");
    const navLinks = $$("#mainNav a");
    const indicator = $("#navIndicator");
    const sections = $$("section[id]");
    let ticking = false;

    function moveIndicator(link) {
        if (!indicator || !link || getComputedStyle(indicator).display === "none") return;
        indicator.style.width = link.offsetWidth + "px";
        indicator.style.transform = `translateX(${link.offsetLeft}px)`;
        indicator.style.opacity = 1;
    }

    function onScroll() {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
        header.classList.toggle("scrolled", y > 20);
        toTop.classList.toggle("show", y > 700);

        let current = "";
        sections.forEach(s => { if (y >= s.offsetTop - 140) current = s.id; });
        let activeLink = null;
        navLinks.forEach(l => {
            const on = l.getAttribute("href") === "#" + current;
            l.classList.toggle("active", on);
            if (on) activeLink = l;
        });
        if (activeLink) moveIndicator(activeLink);
        else if (indicator) indicator.style.opacity = 0;
        ticking = false;
    }
    window.addEventListener("scroll", () => {
        if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", onScroll);
    onScroll();

    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    /* ---------- Mobile menu ---------- */
    const menuToggle = $("#menuToggle");
    const mainNav = $("#mainNav");
    function setMenu(open) {
        mainNav.classList.toggle("show", open);
        menuToggle.setAttribute("aria-expanded", open);
        menuToggle.innerHTML = `<i class="fa-solid ${open ? "fa-xmark" : "fa-bars"}"></i>`;
    }
    menuToggle.addEventListener("click", () => setMenu(!mainNav.classList.contains("show")));
    navLinks.forEach(l => l.addEventListener("click", () => setMenu(false)));
    document.addEventListener("click", e => {
        if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) setMenu(false);
    });

    /* ---------- Cursor glow, 3D tilt, hero parallax, magnetic buttons ---------- */
    if (canHover && !reduceMotion) {
        const glow = $("#cursorGlow");
        window.addEventListener("mousemove", e => {
            glow.classList.add("on");
            glow.style.transform = `translate3d(${e.clientX - 190}px, ${e.clientY - 190}px, 0)`;
        }, { passive: true });
        document.addEventListener("mouseleave", () => glow.classList.remove("on"));

        $$(".tilt").forEach(card => {
            card.addEventListener("mousemove", e => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                card.style.setProperty("--ry", (px * 7).toFixed(2) + "deg");
                card.style.setProperty("--rx", (-py * 7).toFixed(2) + "deg");
            });
            card.addEventListener("mouseleave", () => {
                card.style.setProperty("--rx", "0deg");
                card.style.setProperty("--ry", "0deg");
            });
        });

        const stage = $("#heroStage");
        const layers = $$(".hero-card", stage);
        stage.addEventListener("mousemove", e => {
            const r = stage.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            layers.forEach(l => {
                const d = +l.dataset.depth || 1;
                l.style.transform = `translate3d(${px * 18 * d}px, ${py * 14 * d}px, 0) rotateY(${px * 6 * d}deg) rotateX(${-py * 6 * d}deg)`;
            });
        });
        stage.addEventListener("mouseleave", () => layers.forEach(l => (l.style.transform = "")));

        $$(".magnetic").forEach(b => {
            b.addEventListener("mousemove", e => {
                const r = b.getBoundingClientRect();
                b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28 - 3}px)`;
            });
            b.addEventListener("mouseleave", () => (b.style.transform = ""));
        });
    }

    /* ---------- Button ripple ---------- */
    document.addEventListener("click", e => {
        const btn = e.target.closest(".btn");
        if (!btn || reduceMotion) return;
        const r = btn.getBoundingClientRect();
        const size = Math.max(r.width, r.height);
        const span = document.createElement("span");
        span.className = "ripple";
        span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
        btn.appendChild(span);
        setTimeout(() => span.remove(), 650);
    });

    /* ---------- Product filter ---------- */
    const filterBtns = $$(".filter-btn");
    const productCards = $$(".product-card");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");
            const f = btn.dataset.filter;
            let i = 0;
            productCards.forEach(card => {
                const show = f === "all" || card.dataset.category === f;
                card.classList.remove("pop");
                card.classList.toggle("hide", !show);
                if (show) {
                    card.classList.add("in"); // ensure visible even if not yet revealed
                    card.style.animationDelay = (i++ * 0.08) + "s";
                    void card.offsetWidth;
                    card.classList.add("pop");
                }
            });
        });
    });

    /* ---------- Routine builder ---------- */
    const ringFg = $("#ringFg");
    const RING = 213.6;
    const advice = [
        "Select items above to view total and personalized routine recommendations.",
        "Great start! Adding another item completes a multi-step routine.",
        "Awesome choice! You have built a functional everyday skincare setup.",
        "Perfect Bundle! You unlocked the full Jam Beauty Co. daily glowing routine."
    ];
    let shownTotal = 0;

    function animateTotal(to) {
        const el = $("#calcTotal");
        const from = shownTotal;
        shownTotal = to;
        if (reduceMotion || from === to) { el.textContent = peso(to); return; }
        const t0 = performance.now(), dur = 600;
        const tick = now => {
            const p = Math.min((now - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = peso(Math.round(from + (to - from) * eased));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    function renderRoutine(changed) {
        let total = 0, count = 0;
        ORDER.forEach(k => {
            const on = selected[k];
            if (on) { total += PRODUCTS[k].price; count++; }
            const opt = $(`.calc-option[data-calc="${k}"]`);
            opt.classList.toggle("selected", on);
            opt.setAttribute("aria-pressed", on);
            const btn = $(`.btn-icon[data-toggle="${k}"]`);
            btn.classList.toggle("on", on);
            btn.setAttribute("aria-pressed", on);
            btn.setAttribute("aria-label", `${on ? "Remove" : "Add"} ${PRODUCTS[k].name} ${on ? "from" : "to"} routine`);
            $(`.routine-steps [data-step="${k}"]`).classList.toggle("on", on);
        });
        animateTotal(total);
        ringFg.style.strokeDashoffset = RING - RING * (count / ORDER.length);
        $("#calcAdvice").textContent = advice[count];

        const pill = $("#routinePill");
        $("#pillCount").textContent = count;
        pill.classList.toggle("has", count > 0);
        if (changed) { pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump"); }

        try { localStorage.setItem("jam-routine", JSON.stringify(selected)); } catch (e) {}
    }

    function toggleItem(k, silent) {
        selected[k] = !selected[k];
        renderRoutine(true);
        if (!silent) toast(`${PRODUCTS[k].name} ${selected[k] ? "added to" : "removed from"} your routine`, selected[k] ? "fa-circle-check" : "fa-circle-minus");
    }

    $$(".calc-option").forEach(o => o.addEventListener("click", () => toggleItem(o.dataset.calc)));
    $$("[data-toggle]").forEach(b => b.addEventListener("click", () => toggleItem(b.dataset.toggle)));
    $("#routinePill").addEventListener("click", () => $("#calculator").scrollIntoView({ behavior: "smooth" }));

    $("#clearBundle").addEventListener("click", () => {
        ORDER.forEach(k => (selected[k] = false));
        renderRoutine(true);
        toast("Routine cleared", "fa-rotate-left");
    });

    $("#sendBundle").addEventListener("click", () => {
        const items = ORDER.filter(k => selected[k]);
        if (!items.length) { toast("Pick at least one product first", "fa-circle-info"); return; }
        const total = items.reduce((s, k) => s + PRODUCTS[k].price, 0);
        const lines = items.map(k => `- ${PRODUCTS[k].name} (${peso(PRODUCTS[k].price)})`).join("\n");
        const body = `Hi Jam Beauty Co.!\n\nI'd like to ask about this bundle:\n${lines}\n\nEstimated total: ${peso(total)}\n\nThank you!`;
        toast("Opening your email app with your bundle…", "fa-envelope-open-heart");
        setTimeout(() => {
            window.location.href = `mailto:mondijarjeralynjam081504@gmail.com?subject=${encodeURIComponent("Bundle inquiry")}&body=${encodeURIComponent(body)}`;
        }, 500);
    });

    /* ---------- Product modal ---------- */
    const modal = $("#productModal");
    const modalImg = $("#modalImg");
    let currentKey = null, lastFocus = null;

    function fillModal(k, animate) {
        const p = PRODUCTS[k];
        currentKey = k;
        const apply = () => {
            modalImg.src = p.img;
            modalImg.alt = `Jam Beauty Co. ${p.name}`;
            $("#modalTag").textContent = p.tag;
            $("#modalTitle").textContent = p.name;
            $("#modalPrice").textContent = peso(p.price);
            $("#modalSize").textContent = p.size;
            $("#modalDesc").textContent = p.desc;

            const ul = $("#modalBenefits");
            ul.innerHTML = "";
            p.benefits.forEach(([icon, text], i) => {
                const li = document.createElement("li");
                li.style.animationDelay = (0.15 + i * 0.08) + "s";
                li.innerHTML = `<i class="fa-solid ${icon}"></i><span></span>`;
                li.lastChild.textContent = text;
                ul.appendChild(li);
            });

            const ex = $("#modalExtra");
            ex.innerHTML = "";
            p.extra.forEach(([label, chips]) => {
                const b = document.createElement("b");
                b.textContent = label + ":";
                ex.appendChild(b);
                chips.forEach(c => {
                    const s = document.createElement("span");
                    s.className = "chip";
                    s.textContent = c;
                    ex.appendChild(s);
                });
            });
            updateModalAdd();
            modalImg.classList.remove("swap");
        };
        if (animate && !reduceMotion) {
            modalImg.classList.add("swap");
            setTimeout(apply, 280);
        } else apply();
    }

    function updateModalAdd() {
        const on = selected[currentKey];
        $("#modalAdd").innerHTML = on
            ? '<i class="fa-solid fa-check"></i> In Your Routine'
            : '<i class="fa-solid fa-plus"></i> Add to Routine';
    }

    function openModal(k) {
        lastFocus = document.activeElement;
        fillModal(k, false);
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("locked");
        setTimeout(() => $("#closeModal").focus(), 50);
    }
    function closeModal() {
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("locked");
        if (lastFocus) lastFocus.focus();
    }
    function stepModal(dir) {
        const i = ORDER.indexOf(currentKey);
        fillModal(ORDER[(i + dir + ORDER.length) % ORDER.length], true);
    }

    $$("[data-open]").forEach(b => b.addEventListener("click", () => openModal(b.dataset.open)));
    $("#closeModal").addEventListener("click", closeModal);
    $("#modalDone").addEventListener("click", closeModal);
    $("#modalPrev").addEventListener("click", () => stepModal(-1));
    $("#modalNext").addEventListener("click", () => stepModal(1));
    $("#modalAdd").addEventListener("click", () => { toggleItem(currentKey); updateModalAdd(); });
    modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

    document.addEventListener("keydown", e => {
        if (!modal.classList.contains("active")) return;
        if (e.key === "Escape") closeModal();
        if (e.key === "ArrowRight") stepModal(1);
        if (e.key === "ArrowLeft") stepModal(-1);
        if (e.key === "Tab") { // focus trap
            const f = $$("button", modal).filter(b => b.offsetParent !== null);
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    /* ---------- Contact form ---------- */
    const form = $("#contactForm");
    const msg = $("#message");
    msg.addEventListener("input", () => ($("#msgCount").textContent = `${msg.value.length} / 600`));

    function setErr(id, text) {
        const input = $("#" + id);
        $(`[data-err="${id}"]`).textContent = text;
        input.classList.toggle("invalid", !!text);
        if (text) { input.classList.remove("invalid"); void input.offsetWidth; input.classList.add("invalid"); }
    }
    ["name", "email", "message"].forEach(id => $("#" + id).addEventListener("input", () => setErr(id, "")));

    form.addEventListener("submit", e => {
        e.preventDefault();
        const name = $("#name").value.trim();
        const email = $("#email").value.trim();
        const message = msg.value.trim();
        let ok = true;
        if (name.length < 2) { setErr("name", "Please enter your name."); ok = false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("email", "Please enter a valid email."); ok = false; }
        if (message.length < 5) { setErr("message", "Please write a short message."); ok = false; }
        if (!ok) { toast("Please check the highlighted fields", "fa-circle-exclamation"); return; }

        const body = `${message}\n\n— ${name}\n${email}`;
        toast("Salamat! Opening your email app…", "fa-paper-plane");
        setTimeout(() => {
            window.location.href = `mailto:mondijarjeralynjam081504@gmail.com?subject=${encodeURIComponent("Message from " + name)}&body=${encodeURIComponent(body)}`;
            form.reset();
            $("#msgCount").textContent = "0 / 600";
        }, 600);
    });

    /* ---------- Footer year + initial render ---------- */
    const yr = $("#currentYear");
    if (yr) yr.textContent = new Date().getFullYear();
    renderRoutine(false);
    shownTotal = ORDER.reduce((s, k) => s + (selected[k] ? PRODUCTS[k].price : 0), 0);
    $("#calcTotal").textContent = peso(shownTotal);
})();
