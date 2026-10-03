(() => {
  const RESUMES = {
    design: "resumes/Tyler_Chisholm_Resume_Technical_Designer.pdf",
    rendering: "resumes/Tyler_Chisholm_Resume_Technical_Artist_Rendering.pdf",
    simulation: "resumes/Tyler_Chisholm_Resume_RealTime_Simulation.pdf",
  };
  const ytBase = "https://www.youtube-nocookie.com/embed/";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  const autoplay = !reduceMotion && !saveData;
  let active = null;

  /* Reels: a poster first, a muted loop while the reel is on screen, the full player on request. */

  function applyFraming(frame, d) {
    // Editor captures are zoomed toward the viewport so the footage, not the editor chrome, fills the frame.
    frame.style.setProperty("--crop", d.crop || 1);
    frame.style.setProperty("--focus", d.focus || "50% 50%");
  }

  function fixPoster(img, id) {
    // maxresdefault does not exist for every upload; YouTube answers with a 120x90 placeholder.
    const fallback = () => { img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; };
    img.addEventListener("error", fallback, { once: true });
    img.addEventListener("load", () => { if (img.naturalWidth <= 120) fallback(); }, { once: true });
    if (img.complete && img.naturalWidth && img.naturalWidth <= 120) fallback();
  }

  function clearMedia(frame) {
    frame.querySelectorAll("iframe, video").forEach((el) => el.remove());
    frame.classList.remove("live", "full");
    clearTimeout(frame._reveal);
    frame._reveal = null;
  }

  function command(iframe, func, args) {
    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: args || [] }), "*");
  }

  function startPreview(frame) {
    if (frame.classList.contains("full") || frame.querySelector(".preview")) return;
    const id = frame.dataset.yt;
    let el;
    if (frame.dataset.loop) {
      el = document.createElement("video");
      Object.assign(el, { src: frame.dataset.loop, muted: true, loop: true, playsInline: true, autoplay: true });
      el.addEventListener("playing", () => frame.classList.add("live"), { once: true });
    } else {
      const start = frame.dataset.start || 0;
      el = document.createElement("iframe");
      el.dataset.start = start;
      el.src = `${ytBase}${id}?autoplay=1&mute=1&controls=0&start=${start}&playsinline=1&rel=0&disablekb=1&iv_load_policy=3&fs=0&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
      el.title = "Muted preview";
      el.tabIndex = -1;
      el.allow = "autoplay; encrypted-media";
      el.addEventListener("load", () => {
        // The player only reports its state after it hears "listening", and it may not be ready on load.
        let tries = 0;
        el._hello = setInterval(() => {
          if (++tries > 20 || !el.isConnected) return clearInterval(el._hello);
          el.contentWindow.postMessage(JSON.stringify({ event: "listening", id }), "*");
        }, 400);
      }, { once: true });
    }
    el.className = "preview";
    el.setAttribute("aria-hidden", "true");
    frame.append(el);
  }

  // The embed's own loop restarts at 0:00, so previews loop by seeking back to their start point instead.
  addEventListener("message", (e) => {
    let host, data;
    try { host = new URL(e.origin).hostname; } catch { return; }
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return;
    try { data = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
    const state = data.event === "onStateChange" ? data.info : data.info && data.info.playerState;
    document.querySelectorAll("iframe.preview").forEach((f) => {
      if (f.contentWindow !== e.source) return;
      clearInterval(f._hello);
      const frame = f.closest(".reel-frame");
      if (state === 1 && !frame._reveal) {
        // Reveal once frames are moving and YouTube's title overlay has faded.
        frame._reveal = setTimeout(() => frame.classList.add("live"), 2500);
      } else if (state === 0) {
        command(f, "seekTo", [Number(f.dataset.start) || 0, true]);
        command(f, "playVideo");
      }
    });
  });

  function playFull(frame) {
    clearMedia(frame);
    const el = document.createElement("iframe");
    el.src = `${ytBase}${frame.dataset.yt}?autoplay=1&playsinline=1&rel=0` + (frame.dataset.start ? `&start=${frame.dataset.start}` : "");
    el.title = frame.querySelector(".reel-poster").alt;
    el.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    el.allowFullscreen = true;
    frame.append(el);
    frame.classList.add("full");
  }

  function showVideo(frame, d) {
    if (frame.dataset.yt === d.yt && (frame.dataset.start || "") === (d.start || "")) return;
    const wasFull = frame.classList.contains("full");
    clearMedia(frame);
    frame.dataset.yt = d.yt;
    ["loop", "start", "crop", "focus"].forEach((k) => {
      if (d[k]) frame.dataset[k] = d[k]; else delete frame.dataset[k];
    });
    applyFraming(frame, frame.dataset);
    const poster = frame.querySelector(".reel-poster");
    poster.src = `https://i.ytimg.com/vi/${d.yt}/maxresdefault.jpg`;
    fixPoster(poster, d.yt);
    if (wasFull) playFull(frame);
    else if (autoplay && frame === active) startPreview(frame);
  }

  const frames = [...document.querySelectorAll(".reel-frame")];
  frames.forEach((frame) => {
    applyFraming(frame, frame.dataset);
    const poster = frame.querySelector(".reel-poster");
    fixPoster(poster, frame.dataset.yt);
    frame.querySelector(".reel-sound").addEventListener("click", () => playFull(frame));
    poster.addEventListener("click", () => playFull(frame));
  });

  /* "What I did": each item opens its explanation and, when it has one, switches the project's video. */

  function openItem(item, fromClick) {
    const project = item.closest(".project");
    project.querySelectorAll(".did li").forEach((li) => {
      const open = li === item;
      li.classList.toggle("open", open);
      li.querySelector(".did-head").setAttribute("aria-expanded", String(open));
    });
    const head = item.querySelector(".did-head");
    if (!head.dataset.yt) return;
    const frame = project.querySelector(".reel-frame");
    showVideo(frame, head.dataset);
    const caption = project.querySelector(".reel-caption");
    if (caption && head.dataset.caption) caption.textContent = head.dataset.caption;
    project.querySelector(".reel-poster").alt = head.firstChild.textContent.trim() + " video";
    if (fromClick) {
      const r = frame.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) frame.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }
  }

  document.querySelectorAll(".did-head").forEach((head, i) => {
    const body = head.nextElementSibling;
    body.id = body.id || `did-${i}`;
    head.setAttribute("aria-controls", body.id);
    head.addEventListener("click", () => openItem(head.closest("li"), true));
  });

  function openFirstVisible() {
    document.querySelectorAll(".project").forEach((project) => {
      const visible = [...project.querySelectorAll(".did li")].filter((li) => li.classList.contains("role-on"));
      const current = visible.find((li) => li.classList.contains("open"));
      if (!current && visible[0]) openItem(visible[0], false);
    });
  }

  /* Role switch: ?for=rendering or ?for=simulation in a link preselects a role. */

  function setRole(role, push) {
    if (!RESUMES[role]) role = "design";
    document.body.dataset.role = role;
    document.querySelectorAll("[data-for]").forEach((el) => {
      el.classList.toggle("role-on", el.dataset.for.split(" ").includes(role));
    });
    document.querySelectorAll("[data-resume]").forEach((a) => { a.href = RESUMES[role]; });
    document.querySelectorAll(".project").forEach((p) => {
      p.style.order = p.dataset["order" + role[0].toUpperCase() + role.slice(1)] || 0;
    });
    const input = document.querySelector(`.role input[value="${role}"]`);
    if (input) input.checked = true;
    openFirstVisible();
    if (push) {
      const url = new URL(location.href);
      if (role === "design") url.searchParams.delete("for"); else url.searchParams.set("for", role);
      history.replaceState(null, "", url);
    }
  }

  document.querySelectorAll(".role input").forEach((input) => {
    input.addEventListener("change", () => setRole(input.value, true));
  });
  setRole(new URLSearchParams(location.search).get("for"), false);

  /* Only the most visible reel plays its preview, so the page never runs more than one embed at a time. */

  if (autoplay && "IntersectionObserver" in window) {
    const ratios = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
      let best = null, bestRatio = 0.55;
      ratios.forEach((r, f) => { if (r > bestRatio) { best = f; bestRatio = r; } });
      if (best === active) return;
      if (active && !active.classList.contains("full")) clearMedia(active);
      active = best;
      if (active) startPreview(active);
    }, { threshold: [0, 0.25, 0.55, 0.75, 1] });
    frames.forEach((f) => io.observe(f));
  }
})();
