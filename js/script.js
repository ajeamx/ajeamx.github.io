/**
 * AJEA — Asistencia Jurídica y Estrategias Ambientales
 * Script principal: navegación móvil, estado activo del nav,
 * acordeón de servicios, revelado con IntersectionObserver
 * y envío del formulario de contacto vía Formspree.
 */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* -----------------------------------------------------------------
   * 1. Navegación móvil (menú hamburguesa)
   * --------------------------------------------------------------- */
  function initMobileNav() {
    var toggle = document.querySelector(".nav__toggle");
    var nav = document.querySelector(".nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    // Cierra el menú al elegir un enlace (útil en móvil, una sola página visible a la vez)
    nav.querySelectorAll(".nav__link").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* -----------------------------------------------------------------
   * 2. Resalta el enlace activo según la página actual
   * --------------------------------------------------------------- */
  function markActiveNavLink() {
    var current = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav__link").forEach(function (link) {
      var href = link.getAttribute("href");
      if (href === current) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  /* -----------------------------------------------------------------
   * 3. Acordeón de servicios (servicios.html)
   * --------------------------------------------------------------- */
  function initAccordion() {
    var buttons = document.querySelectorAll(".accordion__button");
    if (!buttons.length) return;

    buttons.forEach(function (button) {
      var panel = document.getElementById(button.getAttribute("aria-controls"));
      if (!panel) return;

      button.addEventListener("click", function () {
        var isExpanded = button.getAttribute("aria-expanded") === "true";
        setPanelState(button, panel, !isExpanded);
      });
    });

    // Abre automáticamente el primer elemento para invitar a explorar
    var first = buttons[0];
    if (first) {
      var firstPanel = document.getElementById(first.getAttribute("aria-controls"));
      setPanelState(first, firstPanel, true);
    }
  }

  function setPanelState(button, panel, expand) {
    button.setAttribute("aria-expanded", String(expand));
    if (expand) {
      panel.style.maxHeight = panel.scrollHeight + "px";
    } else {
      panel.style.maxHeight = "0px";
    }
  }

  // Recalcula el alto de los paneles abiertos ante cambios que puedan
  // alterar el reflow del texto: resize de ventana y fuentes web que
  // terminan de cargar después del primer render.
  function recalcOpenPanels() {
    document
      .querySelectorAll('.accordion__button[aria-expanded="true"]')
      .forEach(function (button) {
        var panel = document.getElementById(button.getAttribute("aria-controls"));
        if (panel) panel.style.maxHeight = panel.scrollHeight + "px";
      });
  }

  function initAccordionResize() {
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(recalcOpenPanels, 150);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(recalcOpenPanels);
    }
    window.addEventListener("load", recalcOpenPanels);
  }

  /* -----------------------------------------------------------------
   * 4. Revelado de secciones al entrar en el viewport
   * --------------------------------------------------------------- */
  function initScrollReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach(function (el, index) {
      // Pequeño escalonado entre tarjetas de una misma cuadrícula
      el.style.transitionDelay = Math.min(index * 60, 240) + "ms";
      observer.observe(el);
    });
  }

  /* -----------------------------------------------------------------
   * 5. Formulario de contacto → Formspree (AJAX, sin recargar la página)
   * --------------------------------------------------------------- */
  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var statusBox = document.getElementById("form-status");
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var formAction = form.getAttribute("action");
      var isPlaceholder = !formAction || formAction.indexOf("TU_FORM_ID") !== -1;

      if (isPlaceholder) {
        // Aviso solo para quien administra el sitio: falta conectar Formspree.
        showStatus(
          statusBox,
          "error",
          "El formulario aún no está conectado a un servicio de envío. Sustituye TU_FORM_ID en contacto.html por el ID de tu formulario de Formspree."
        );
        return;
      }

      var originalLabel = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Enviando…";
      }

      fetch(formAction, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      })
        .then(function (response) {
          if (response.ok) {
            form.reset();
            showStatus(
              statusBox,
              "success",
              "Gracias por escribirnos. Tu mensaje fue enviado; te responderemos a la brevedad."
            );
          } else {
            showStatus(
              statusBox,
              "error",
              "No fue posible enviar el mensaje. Intenta nuevamente o escríbenos directo a ajea.consultores@gmail.com."
            );
          }
        })
        .catch(function () {
          showStatus(
            statusBox,
            "error",
            "No fue posible conectar con el servidor. Intenta nuevamente o escríbenos directo a ajea.consultores@gmail.com."
          );
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
          }
        });
    });
  }

  function showStatus(box, type, message) {
    if (!box) return;
    box.textContent = message;
    box.classList.remove("is-success", "is-error");
    box.classList.add(type === "success" ? "is-success" : "is-error");
    box.setAttribute("role", "status");
    box.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
  }

  /* -----------------------------------------------------------------
   * Inicio
   * --------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initMobileNav();
    markActiveNavLink();
    initAccordion();
    initAccordionResize();
    initScrollReveal();
    initContactForm();
  });
})();
