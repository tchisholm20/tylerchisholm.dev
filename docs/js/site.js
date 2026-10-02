(() => {
  const ROLES = {
    design: "resumes/Tyler_Chisholm_Resume_Technical_Designer.pdf",
    rendering: "resumes/Tyler_Chisholm_Resume_Technical_Artist_Rendering.pdf",
    simulation: "resumes/Tyler_Chisholm_Resume_RealTime_Simulation.pdf",
  };

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  const autoplay = !reduceMotion && !saveData;

  /* Role switch: ?for=rendering in a link preselects a role. */

  function setRole(role, push) {
    if (!ROLES[role]) role = "design";
    document.body.dataset.role = role;
    document.querySelectorAll("[data-for]").forEach((el) => {
      el.classList.toggle("role-on", el.dataset.for.split(" ").includes(role));
    });
    document.querySelectorAll("[data-resume]").forEach((a) => { a.href = ROLES[role]; });
    document.querySelectorAll(".project").forEach((p) => {
      p.style.order = p.dataset["order" + role[0].toUpperCase() + role.slice(1)] || 0;
    });
    const input = document.querySelector(`.role input[value="${role}"]`);
    if (input) input.checked = true;
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

  /* Reels: posters first, a muted loop while a reel is on screen, the full player on request. */

  const ytBase = "https://www.youtube-nocookie.com/embed/";

  function previewSrc(id, start) {
    const origin = encodeURIComponent(location.origin);
    return `${ytBase}${id}?autoplay=1&mute=1&controls=0&start=${start}&playsinline=1&rel=0&disablekb=1&iv_load_policy=3&fs=0&enablejsapi=1&origin=${origin}`;
  }

  // The embed's own loop always restarts at 0:00, so previews loop by seeking back to their start point instead.
  function command(iframe, func, args) {
    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: args || [] }), "*");
  }
  addEventListener("message", (e) => {
    let host, data;
    try { host = new URL(e.origin).hostname; } catch { return; }
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return;
    try { data = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
    const state = data.event === "onStateChange" ? data.info : data.info && data.info.playerState;
    if (state !== 0) return;
    document.querySelectorAll("iframe.preview").forEach((f) => {
      if (f.contentWindow !== e.source) return;
      command(f, "seekTo", [Number(f.dataset.start) || 0, true]);
      command(f, "playVideo");
    });
  });
  function playerSrc(id) {
    return `${ytBase}${id}?autoplay=1&playsinline=1&rel=0`;
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
  }

  function startPreview(frame) {
    if (frame.classList.contains("full") || frame.querySelector(".preview")) return;
    const id = frame.dataset.yt;
    let el;
    if (frame.dataset.loop) {
      el = document.createElement("video");
      Object.assign(el, { src: frame.dataset.loop, muted: true, loop: true, playsInline: true, autoplay: true });
      el.setAttribute("aria-hidden", "true");
      el.addEventListener("playing", () => frame.classList.add("live"), { once: true });
    } else {
      el = document.createElement("iframe");
      el.dataset.start = frame.dataset.start || 0;
      el.src = previewSrc(id, el.dataset.start);
      el.title = "Muted preview";
      el.tabIndex = -1;
      el.setAttribute("aria-hidden", "true");
      el.allow = "autoplay; encrypted-media";
      // Keep the poster up while YouTube shows its title overlay.
      el.addEventListener("load", () => {
        el.contentWindow.postMessage(JSON.stringify({ event: "listening", id: id }), "*");
        frame._reveal = setTimeout(() => frame.classList.add("live"), 3200);
      }, { once: true });
    }
    el.className = "preview";
    frame.append(el);
  }

  function stopPreview(frame) {
    if (frame.classList.contains("full")) return;
    clearMedia(frame);
  }

  function playFull(frame) {
    clearMedia(frame);
    const el = document.createElement("iframe");
    el.src = playerSrc(frame.dataset.yt) + (frame.dataset.start ? `&start=${frame.dataset.start}` : "");
    el.title = frame.querySelector(".reel-poster").alt;
    el.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    el.allowFullscreen = true;
    frame.append(el);
    frame.classList.add("full");
  }

  // Editor captures get zoomed toward the viewport so the footage, not the editor chrome, fills the frame.
  function applyFraming(frame, d) {
    frame.style.setProperty("--crop", d.crop || 1);
    frame.style.setProperty("--focus", d.focus || "50% 50%");
  }

  const frames = [...document.querySelectorAll(".reel-frame")];
  frames.forEach((frame) => {
    const id = frame.dataset.yt;
    applyFraming(frame, frame.dataset);
    fixPoster(frame.querySelector(".reel-poster"), id);
    frame.querySelector(".reel-sound").addEventListener("click", () => playFull(frame));
    frame.querySelector(".reel-poster").addEventListener("click", () => playFull(frame));
    frame.querySelector(".reel-poster").style.cursor = "pointer";

    const clips = frame.closest(".reel").querySelectorAll(".clips button");
    clips.forEach((btn) => btn.addEventListener("click", () => {
      if (btn.getAttribute("aria-pressed") === "true") return;
      clips.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      const wasFull = frame.classList.contains("full");
      clearMedia(frame);
      frame.dataset.yt = btn.dataset.yt;
      ["loop", "start", "crop", "focus"].forEach((k) => {
        if (btn.dataset[k]) frame.dataset[k] = btn.dataset[k]; else delete frame.dataset[k];
      });
      applyFraming(frame, frame.dataset);
      const poster = frame.querySelector(".reel-poster");
      poster.src = `https://i.ytimg.com/vi/${btn.dataset.yt}/maxresdefault.jpg`;
      poster.alt = btn.firstChild.textContent.trim() + " video";
      fixPoster(poster, btn.dataset.yt);
      if (wasFull) playFull(frame);
      else if (autoplay && frame === active) startPreview(frame);
    }));
  });

  /* Only the most visible reel plays its preview, so the page never runs more than one embed at a time. */

  let active = null;
  if (autoplay && "IntersectionObserver" in window) {
    const ratios = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
      let best = null, bestRatio = 0.55;
      ratios.forEach((r, f) => { if (r > bestRatio) { best = f; bestRatio = r; } });
      if (best === active) return;
      if (active) stopPreview(active);
      active = best;
      if (active) startPreview(active);
    }, { threshold: [0, 0.25, 0.55, 0.75, 1] });
    frames.forEach((f) => io.observe(f));
  }
})();
