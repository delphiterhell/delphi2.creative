document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
     GLOBAL
     ============================================================ */

  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

  const finePointer =
    window.matchMedia(
      "(pointer: fine)"
    );

  const mobileLayout =
    window.matchMedia(
      "(max-width: 700px)"
    );


  /* ============================================================
     MOBILE MENU
     ============================================================ */

  const mobileMenu =
    document.querySelector(
      "[data-mobile-menu]"
    );

  const menuOpenButton =
    document.querySelector(
      "[data-menu-open]"
    );


  if (
    mobileMenu &&
    menuOpenButton
  ) {

    const desktopNav =
      window.matchMedia(
        "(min-width: 851px)"
      );


    const setMenu = open => {

      mobileMenu.classList.toggle(
        "is-open",
        open
      );

      /* locks the page scroll while the overlay is open */
      document.documentElement.classList.toggle(
        "menu-open",
        open
      );

      menuOpenButton.setAttribute(
        "aria-expanded",
        String(open)
      );

    };


    menuOpenButton.addEventListener(
      "click",
      () => {

        setMenu(true);

        /* flush styles: the overlay must be visible to take focus */
        void mobileMenu.offsetWidth;

        mobileMenu
          .querySelector(
            "[data-menu-close]"
          )
          .focus();

      }
    );


    mobileMenu
      .querySelector(
        "[data-menu-close]"
      )
      .addEventListener(
        "click",
        () => {

          setMenu(false);

          menuOpenButton.focus();

        }
      );


    /* a link closes the menu, then the browser scrolls to its section */
    mobileMenu
      .querySelectorAll("a")
      .forEach(link => {

        link.addEventListener(
          "click",
          () => setMenu(false)
        );

      });


    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Escape" &&
          mobileMenu.classList.contains("is-open")
        ) {

          setMenu(false);

          menuOpenButton.focus();

        }

      }
    );


    /* resized up to desktop with the menu open: release everything */
    desktopNav.addEventListener(
      "change",
      event => {

        if (event.matches) {

          setMenu(false);

        }

      }
    );

  }


  /* ============================================================
     HERO PALETTE
     ============================================================ */

  document
    .querySelectorAll(
      ".palette-card"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          const wasActive =
            card.classList.contains(
              "is-active"
            );


          document
            .querySelectorAll(
              ".palette-card"
            )
            .forEach(item => {

              item.classList.remove(
                "is-active"
              );

            });


          if (!wasActive) {

            card.classList.add(
              "is-active"
            );

          }

        }
      );

    });


  /* ============================================================
     HERO IMAGE PARALLAX
     ============================================================ */

  const hero =
    document.querySelector(
      ".hero"
    );

  const heroImage =
    document.querySelector(
      ".hero-image"
    );

  const heroFlow =
    document.querySelector(
      ".hero-flow"
    );

  // the image and its animated canvas move together
  const setHeroTransform =
    value => {

      heroImage.style.transform =
        value;

      if (
        heroFlow
      ) {
        heroFlow.style.transform =
          value;
      }

    };


  if (
    hero &&
    heroImage &&
    finePointer.matches &&
    !reducedMotion.matches
  ) {

    hero.addEventListener(
      "mousemove",
      event => {

        const rect =
          hero.getBoundingClientRect();


        const x =
          (
            event.clientX -
            rect.left
          ) /
          rect.width -
          0.5;


        const y =
          (
            event.clientY -
            rect.top
          ) /
          rect.height -
          0.5;


        setHeroTransform(`
          scale(1.035)
          translate(
            ${x * 8}px,
            ${y * 6}px
          )
        `);

      }
    );


    hero.addEventListener(
      "mouseleave",
      () => {

        setHeroTransform(
          "scale(1.02) translate(0, 0)"
        );

      }
    );

  }


  /* ============================================================
     HERO MARBLE FLOW
     The marbling drifts very slowly, like liquid, via a WebGL
     displacement shader. Any failure leaves the static <img>.
     ============================================================ */

  if (
    hero &&
    heroImage &&
    heroFlow &&
    !reducedMotion.matches
  ) {

    initHeroFlow(
      hero,
      heroImage,
      heroFlow
    );

  }


  function initHeroFlow(
    hero,
    image,
    canvas
  ) {

    const gl =
      canvas.getContext(
        "webgl",
        {
          alpha: false,
          antialias: false,
          premultipliedAlpha: false
        }
      );

    if (
      !gl
    ) {
      canvas.remove();
      return;
    }


    const vertexSource = `
      attribute vec2 aPos;
      varying vec2 vUv;

      void main() {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;


    const fragmentSource = `
      // phones really compute mediump at 16 bits, which flattens the
      // noise below into a still image: ask for highp where it exists
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif

      uniform sampler2D uImage;
      uniform vec2 uRes;
      uniform vec2 uImg;
      uniform float uTime;

      varying vec2 vUv;

      // no sin(): on phone GPUs the classic sin-based hash breaks
      // down into visible stripes that crawl across the image
      float hash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);

        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;

        for (int i = 0; i < 3; i++) {
          v += a * noise(p);
          p *= 2.03;
          a *= 0.5;
        }

        return v;
      }

      void main() {
        float canvasRatio = uRes.x / uRes.y;
        float imageRatio = uImg.x / uImg.y;

        // object-fit: cover + object-position: center right
        vec2 visible = canvasRatio > imageRatio
          ? vec2(1.0, imageRatio / canvasRatio)
          : vec2(canvasRatio / imageRatio, 1.0);

        vec2 uv = vec2(
          1.0 - visible.x + vUv.x * visible.x,
          0.5 - visible.y * 0.5 + vUv.y * visible.y
        );

        // slow domain-warped noise = liquid drift
        vec2 p = vUv * vec2(canvasRatio, 1.0) * 2.2;
        float t = uTime * 0.062;

        vec2 q = vec2(
          fbm(p + vec2(0.0, t)),
          fbm(p + vec2(5.2, 1.3) - t)
        );

        vec2 d = vec2(
          fbm(p + 2.0 * q + vec2(1.7, 9.2) + t * 0.6),
          fbm(p + 2.0 * q + vec2(8.3, 2.8) - t * 0.6)
        ) - 0.5;

        // the drift is measured against the screen width: on portrait
        // screens the vertical share is cut down to match, otherwise the
        // tall side would stretch it into a fast, smeared wobble
        vec2 amp = vec2(1.0, min(1.0, canvasRatio));

        // portrait screens zoom the image in, so the same drift
        // reads smaller: a light boost as the ratio narrows
        float boost = mix(
          1.0,
          1.3,
          clamp((1.2 - canvasRatio) / 0.7, 0.0, 1.0)
        );

        uv += d * 0.036 * boost * amp * visible;

        // past the image border, fold back in instead of dragging
        // the last row of pixels into streaks
        uv = 1.0 - abs(1.0 - abs(uv));

        gl_FragColor = texture2D(uImage, uv);
      }
    `;


    const compile =
      (
        type,
        source
      ) => {

        const shader =
          gl.createShader(type);

        gl.shaderSource(
          shader,
          source
        );

        gl.compileShader(
          shader
        );

        return gl.getShaderParameter(
          shader,
          gl.COMPILE_STATUS
        )
          ? shader
          : null;

      };


    const vertexShader =
      compile(
        gl.VERTEX_SHADER,
        vertexSource
      );

    const fragmentShader =
      compile(
        gl.FRAGMENT_SHADER,
        fragmentSource
      );


    if (
      !vertexShader ||
      !fragmentShader
    ) {
      canvas.remove();
      return;
    }


    const program =
      gl.createProgram();

    gl.attachShader(
      program,
      vertexShader
    );

    gl.attachShader(
      program,
      fragmentShader
    );

    gl.linkProgram(
      program
    );


    if (
      !gl.getProgramParameter(
        program,
        gl.LINK_STATUS
      )
    ) {
      canvas.remove();
      return;
    }


    gl.useProgram(
      program
    );


    const buffer =
      gl.createBuffer();

    gl.bindBuffer(
      gl.ARRAY_BUFFER,
      buffer
    );

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
      ]),
      gl.STATIC_DRAW
    );


    const aPos =
      gl.getAttribLocation(
        program,
        "aPos"
      );

    gl.enableVertexAttribArray(
      aPos
    );

    gl.vertexAttribPointer(
      aPos,
      2,
      gl.FLOAT,
      false,
      0,
      0
    );


    const uRes =
      gl.getUniformLocation(
        program,
        "uRes"
      );

    const uImg =
      gl.getUniformLocation(
        program,
        "uImg"
      );

    const uTime =
      gl.getUniformLocation(
        program,
        "uTime"
      );


    let running =
      false;

    let lastFrame =
      0;

    let frameId =
      0;


    const resize =
      () => {

        // capped resolution: the image is soft, no need for full DPR
        const ratio =
          Math.min(
            window.devicePixelRatio || 1,
            1.5
          );

        const width =
          Math.round(
            canvas.clientWidth * ratio
          );

        const height =
          Math.round(
            canvas.clientHeight * ratio
          );


        if (
          canvas.width !== width ||
          canvas.height !== height
        ) {

          canvas.width =
            width;

          canvas.height =
            height;

          gl.viewport(
            0,
            0,
            width,
            height
          );

        }


        gl.uniform2f(
          uRes,
          width,
          height
        );

      };


    const draw =
      now => {

        frameId =
          requestAnimationFrame(
            draw
          );


        // ~30fps is plenty for a movement this slow
        if (
          now - lastFrame < 33
        ) {
          return;
        }


        // the hero is covered once the page has scrolled past it
        if (
          window.scrollY >
          hero.offsetHeight
        ) {
          return;
        }


        lastFrame =
          now;

        gl.uniform1f(
          uTime,
          now / 1000
        );

        gl.drawArrays(
          gl.TRIANGLE_STRIP,
          0,
          4
        );


        if (
          !canvas.classList.contains(
            "is-ready"
          )
        ) {
          canvas.classList.add(
            "is-ready"
          );
        }

      };


    const start =
      () => {

        const texture =
          gl.createTexture();

        gl.bindTexture(
          gl.TEXTURE_2D,
          texture
        );

        gl.pixelStorei(
          gl.UNPACK_FLIP_Y_WEBGL,
          true
        );


        try {

          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGB,
            gl.RGB,
            gl.UNSIGNED_BYTE,
            image
          );

        }

        catch (
          error
        ) {

          // e.g. opened from file:// — keep the static image
          canvas.remove();
          return;

        }


        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_WRAP_S,
          gl.CLAMP_TO_EDGE
        );

        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_WRAP_T,
          gl.CLAMP_TO_EDGE
        );

        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR
        );

        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MAG_FILTER,
          gl.LINEAR
        );


        gl.uniform2f(
          uImg,
          image.naturalWidth,
          image.naturalHeight
        );


        resize();


        if (
          "ResizeObserver" in window
        ) {

          new ResizeObserver(
            resize
          ).observe(
            canvas
          );

        }

        else {

          window.addEventListener(
            "resize",
            resize
          );

        }


        running =
          true;

        frameId =
          requestAnimationFrame(
            draw
          );

      };


    canvas.addEventListener(
      "webglcontextlost",
      event => {

        event.preventDefault();

        if (
          running
        ) {
          cancelAnimationFrame(
            frameId
          );
        }

        canvas.remove();

      }
    );


    if (
      image.complete &&
      image.naturalWidth
    ) {

      start();

    }

    else {

      image.addEventListener(
        "load",
        start,
        {
          once: true
        }
      );

    }

  }


  /* ============================================================
     SERVICES — ACCORDION
     ============================================================ */

  const accordionItems = [
    ...document.querySelectorAll(
      "[data-accordion-item]"
    )
  ];


  accordionItems.forEach(item => {

    const trigger =
      item.querySelector(
        "[data-accordion-trigger]"
      );

    trigger.addEventListener(
      "click",
      () => {

        const wasOpen =
          item.classList.contains(
            "is-open"
          );


        accordionItems.forEach(other => {

          other.classList.remove(
            "is-open"
          );

          other
            .querySelector(
              "[data-accordion-trigger]"
            )
            .setAttribute(
              "aria-expanded",
              "false"
            );

        });


        if (!wasOpen) {

          item.classList.add(
            "is-open"
          );

          trigger.setAttribute(
            "aria-expanded",
            "true"
          );

        }

      }
    );

  });


  // desktop/tablet opens "Web" by default; mobile starts all closed
  if (
    accordionItems.length &&
    window.matchMedia(
      "(min-width: 701px)"
    ).matches
  ) {

    accordionItems[0]
      .querySelector(
        "[data-accordion-trigger]"
      )
      .click();

  }


  /* ============================================================
     PROJECT VIDEO — LAZY LOAD
     ============================================================ */

  const projectVideos =
    document.querySelectorAll(
      "[data-project-video]"
    );


  if (
    projectVideos.length &&
    "IntersectionObserver" in window
  ) {

    const onScreen =
      new Set();


    const setSource = video => {

      if (
        video.src ||
        !video.dataset.src
      ) {
        return;
      }

      // playback is started by the observer below, not on load
      if (
        !reducedMotion.matches
      ) {

        video.autoplay = false;

      }

      video.src =
        video.dataset.src;

      video.load();

    };


    const playVideo = video => {

      if (
        reducedMotion.matches
      ) {
        return;
      }

      // mobile browsers only allow unattended playback when
      // these are set as properties, not just as attributes
      video.muted = true;

      video.playsInline = true;

      // covers a fast scroll that skips the early loading zone
      setSource(video);

      video
        .play()
        .catch(() => {});

    };


    // the file is fetched a little before the video scrolls in...
    const videoLoader =
      new IntersectionObserver(
        entries => {

          entries.forEach(entry => {

            const video =
              entry.target;


            if (
              !entry.isIntersecting
            ) {
              return;
            }


            setSource(video);

            videoLoader.unobserve(
              video
            );

          });

        },
        {
          rootMargin:
            "600px 0px"
        }
      );


    // ...and it starts only once it is actually on screen
    const videoObserver =
      new IntersectionObserver(
        entries => {

          entries.forEach(entry => {

            const video =
              entry.target;


            if (
              entry.isIntersecting
            ) {

              onScreen.add(video);

              playVideo(video);

            }

            else {

              onScreen.delete(video);

              video.pause();

            }

          });

        },
        {
          threshold: .2
        }
      );


    projectVideos.forEach(video => {

      // phones often refuse the first play() while the file is still
      // arriving: try again as soon as it can actually play
      video.addEventListener(
        "canplay",
        () => {

          if (
            onScreen.has(video) &&
            video.paused
          ) {
            playVideo(video);
          }

        }
      );

      videoLoader.observe(
        video
      );

      videoObserver.observe(
        video
      );

    });

  }


  /* ============================================================
     SITE RECORDING — shown over the replica once it can play
     ============================================================ */

  document
    .querySelectorAll(
      ".lm-site-video"
    )
    .forEach(video => {

      video.addEventListener(
        "loadeddata",
        () => video.classList.add("is-loaded")
      );

    });


  /* ============================================================
     GENERIC REVEALS
     ============================================================ */

  const revealItems =
    document.querySelectorAll(
      "[data-reveal]"
    );


  if (
    reducedMotion.matches ||
    !(
      "IntersectionObserver" in window
    )
  ) {

    revealItems.forEach(item => {

      item.classList.add(
        "is-visible"
      );

    });

  }

  else {

    const revealObserver =
      new IntersectionObserver(
        entries => {

          entries.forEach(entry => {

            if (
              !entry.isIntersecting
            ) {
              return;
            }


            entry.target
              .classList
              .add(
                "is-visible"
              );


            revealObserver
              .unobserve(
                entry.target
              );

          });

        },
        {
          threshold:
            0.12,

          rootMargin:
            "0px 0px -6% 0px"
        }
      );


    revealItems.forEach(item => {

      revealObserver.observe(
        item
      );

    });

  }


  /* ============================================================
     GSAP
     ============================================================ */

  const gsapReady =
    typeof window.gsap !==
      "undefined" &&
    typeof window.ScrollTrigger !==
      "undefined";


  if (
    gsapReady &&
    !reducedMotion.matches
  ) {

    gsap.registerPlugin(
      ScrollTrigger
    );


    /* ==========================================================
       INTRO TITLE
       ========================================================== */

    document
      .querySelectorAll(
        "[data-motion-title]"
      )
      .forEach(title => {

        gsap.fromTo(
          title,
          {
            yPercent:
              105,

            opacity:
              0
          },
          {
            yPercent:
              0,

            opacity:
              1,

            duration:
              1,

            ease:
              "power4.out",

            scrollTrigger: {

              trigger:
                title,

              start:
                "top 86%",

              once:
                true

            }
          }
        );

      });


    /* ==========================================================
       INTRO COPY
       ========================================================== */

    const introCopy =
      document.querySelectorAll(
        "[data-motion-copy]"
      );


    if (
      introCopy.length
    ) {

      gsap.fromTo(
        introCopy,
        {
          y:
            30,

          opacity:
            0
        },
        {
          y:
            0,

          opacity:
            1,

          duration:
            .9,

          stagger:
            .12,

          ease:
            "power3.out",

          scrollTrigger: {

            trigger:
              ".intro-copy",

            start:
              "top 84%",

            once:
              true

          }
        }
      );

    }


    /* ==========================================================
       INTRO IMAGE REVEAL
       ========================================================== */

    const introReveal =
      document.querySelector(
        ".intro-portrait__reveal"
      );


    if (
      introReveal
    ) {

      gsap.to(
        introReveal,
        {
          xPercent:
            102,

          duration:
            1.15,

          ease:
            "power4.inOut",

          scrollTrigger: {

            trigger:
              ".intro-portrait__image",

            start:
              "top 72%",

            once:
              true

          }
        }
      );

    }


    /* ==========================================================
       INTRO IMAGE PARALLAX
       ========================================================== */

    const introPhoto =
      document.querySelector(
        ".intro-portrait__image img"
      );


    if (
      introPhoto &&
      !mobileLayout.matches
    ) {

      /*
       * The photo is scaled up just enough (3.5% per side) to
       * cover its ±3% travel, so the container's background
       * never shows as a light strip above or below it.
       */

      gsap.fromTo(
        introPhoto,
        {
          yPercent:
            -3,

          scale:
            1.07
        },
        {
          yPercent:
            3,

          scale:
            1.07,

          ease:
            "none",

          scrollTrigger: {

            trigger:
              ".intro-portrait",

            start:
              "top bottom",

            end:
              "bottom top",

            scrub:
              1.2

          }
        }
      );

    }


    /* ==========================================================
       SELECTED WORK INTRO
       ========================================================== */

    const worksIntro =
      document.querySelector(
        ".works-intro__bottom"
      );


    if (
      worksIntro
    ) {

      gsap.fromTo(
        worksIntro,
        {
          y:
            22,

          opacity:
            0
        },
        {
          y:
            0,

          opacity:
            1,

          duration:
            .8,

          ease:
            "power3.out",

          scrollTrigger: {

            trigger:
              ".works-intro",

            start:
              "top 88%",

            once:
              true

          }
        }
      );

    }


    /* ==========================================================
       LORENZO — CASE STUDY FRAME
       Enters once (fade + slight rise), then stays still.
       Only the video inside moves, by a few pixels.
       ========================================================== */

    const caseFrame =
      document.querySelector(
        "[data-case-frame]"
      );


    if (
      caseFrame
    ) {

      const caseMobile =
        mobileLayout.matches;


      gsap.fromTo(
        caseFrame,
        {

          opacity:
            0,

          y:
            caseMobile
              ? 24
              : 40,

          scale:
            caseMobile
              ? 1
              : .98

        },
        {

          opacity:
            1,

          y:
            0,

          scale:
            1,

          duration:
            1.2,

          ease:
            "power3.out",

          // once in place the frame keeps no transform at all
          clearProps:
            "transform",

          scrollTrigger: {

            trigger:
              caseFrame,

            start:
              "top 85%",

            once:
              true

          }

        }
      );


      gsap.utils
        .toArray(
          "[data-case-reveal]"
        )
        .forEach(element => {

          gsap.fromTo(
            element,
            {

              opacity:
                0,

              y:
                24

            },
            {

              opacity:
                1,

              y:
                0,

              duration:
                1,

              ease:
                "power3.out",

              scrollTrigger: {

                trigger:
                  element,

                start:
                  "top 88%",

                once:
                  true

              }

            }
          );

        });


      const caseParallax =
        caseFrame.querySelector(
          "[data-case-parallax]"
        );


      if (
        caseParallax &&
        !caseMobile
      ) {

        gsap.fromTo(
          caseParallax,
          {
            y:
              -12
          },
          {

            y:
              12,

            ease:
              "none",

            scrollTrigger: {

              trigger:
                caseFrame,

              start:
                "top bottom",

              end:
                "bottom top",

              scrub:
                true

            }

          }
        );

      }

    }


    /* ==========================================================
       MAGA + POMERANZE
       ========================================================== */

    gsap
      .utils
      .toArray(
        ".project-browser"
      )
      .forEach(browser => {

        gsap.fromTo(
          browser,
          {

            y:
              26,

            scale:
              .985

          },
          {

            y:
              -10,

            scale:
              1,

            ease:
              "none",

            scrollTrigger: {

              trigger:
                browser,

              start:
                "top bottom",

              end:
                "bottom top",

              scrub:
                1

            }

          }
        );

      });


    /* ==========================================================
       CONCEPT CARDS
       ========================================================== */

    const conceptCards =
      gsap.utils.toArray(
        "[data-concept-card]"
      );


    if (
      conceptCards.length
    ) {

      conceptCards.forEach(
        card => {

          gsap.fromTo(
            card,
            {

              y:
                60,

              opacity:
                0

            },
            {

              y:
                0,

              opacity:
                1,

              duration:
                1.1,

              ease:
                "power3.out",

              clearProps:
                "filter",

              scrollTrigger: {

                trigger:
                  card,

                start:
                  "top 85%",

                once:
                  true

              }

            }
          );

        }
      );

    }


    /* ==========================================================
       SERVICES HEADING
       ========================================================== */

    const servicesHeading =
      document.querySelector(
        ".services__heading"
      );


    if (
      servicesHeading
    ) {

      gsap.fromTo(
        servicesHeading,
        {

          y:
            45,

          opacity:
            0

        },
        {

          y:
            0,

          opacity:
            1,

          duration:
            .95,

          ease:
            "power4.out",

          scrollTrigger: {

            trigger:
              ".services",

            start:
              "top 78%",

            once:
              true

          }

        }
      );

    }


    /* ==========================================================
       PACKAGES
       ========================================================== */

    const offerItems =
      gsap.utils.toArray(
        ".offers__item"
      );


    if (
      !mobileLayout.matches
    ) {

      offerItems.forEach(
        (
          item,
          index
        ) => {

          gsap.fromTo(
            item,
            {

              y:
                60,

              opacity:
                0

            },
            {

              y:
                0,

              opacity:
                1,

              duration:
                1.1,

              delay:
                index * .12,

              ease:
                "power4.out",

              scrollTrigger: {

                trigger:
                  ".offers",

                start:
                  "top 84%",

                once:
                  true

              }

            }
          );

        }
      );

    }


    /* ==========================================================
       CONTACT
       ========================================================== */

    const contact =
      document.querySelector(
        ".contact"
      );


    if (
      contact
    ) {

      gsap.fromTo(
        ".contact h2",
        {

          yPercent:
            28,

          opacity:
            0

        },
        {

          yPercent:
            0,

          opacity:
            1,

          duration:
            1.05,

          ease:
            "power4.out",

          scrollTrigger: {

            trigger:
              contact,

            start:
              "top 76%",

            once:
              true

          }

        }
      );

    }


    /* ==========================================================
       REFRESH
       ========================================================== */

    window.addEventListener(
      "load",
      () => {

        ScrollTrigger.refresh();

      }
    );


    if (
      document.fonts &&
      document.fonts.ready
    ) {

      document
        .fonts
        .ready
        .then(() => {

          ScrollTrigger.refresh();

        });

    }

  }


  /* ============================================================
     FALLBACK
     ============================================================ */

  else {

    document
      .querySelectorAll(`
        [data-motion-title],
        [data-motion-copy],
        [data-concept-card],
        [data-reveal]
      `)
      .forEach(element => {

        element.style.opacity =
          "1";

        element.style.transform =
          "none";

        element.style.filter =
          "none";

        element.style.clipPath =
          "none";

      });


    const introReveal =
      document.querySelector(
        ".intro-portrait__reveal"
      );


    if (
      introReveal
    ) {

      introReveal.style.display =
        "none";

    }

  }

});