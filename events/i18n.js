// Simple i18n module. Default language: Catalan (ca).
// Usage: import { t, getLocale, setLocale, applyTranslations, initLanguageSwitcher } from "./i18n.js";

export const DICT = {
  ca: {
    nav_new_event: "Nou esdeveniment",
    nav_events: "Esdeveniments",
    nav_availability: "La meva disponibilitat",
    nav_results: "Resultats",
    nav_people: "Qui ve",
    back_to_site: "Tornar al lloc",
    back_all_events: "Tots els esdeveniments",

    hero_title: "Planifica la propera trobada",
    hero_intro: "Crea un esdeveniment, proposa dates i comparteix l'enllaç amb els amics perquè marquin quan estan lliures. Veuràs a l'instant quina data funciona millor per a tothom.",
    btn_create_event: "Crear esdeveniment",
    btn_see_events: "Veure esdeveniments",

    create_title: "Crear un nou esdeveniment",
    create_sub: "Posa-li un nom i proposa algunes dates candidates al calendari.",
    label_event_name: "Nom de l'esdeveniment",
    placeholder_event_name: "p. ex. Sopar de Nadal",
    label_pick_dates: "Dates candidates — clica els dies al calendari",
    btn_create: "Crear esdeveniment",
    btn_create_vote: "Crear esdeveniment i començar votació",
    vote_count_label: "persona ha votat|persones han votat",

    events_title: "Esdeveniments",
    events_sub: "Obre un esdeveniment per afegir la teva disponibilitat o veure els resultats.",
    loading_events: "Carregant esdeveniments…",
    no_events: "Encara no hi ha esdeveniments. Crea el primer!",
    footer_hint: "Les dades se sincronitzen en temps real amb Firebase. Comparteix l'enllaç d'un esdeveniment amb els teus amics.",
    chip_open: "Obrir →",
    btn_vote: "Votar",
    no_votes_yet: "Ningú ha votat encara",
    ev_dates_count: (n) => `${n} data(es) candidata(es)`,
    ev_status_voting: "En votació",
    ev_status_approved: "Data confirmada ✅",

    availability_title: "La teva disponibilitat",
    availability_sub: "Introdueix el teu nom, tria \u201cDisponible\u201d o \u201cTentatiu\u201d i marca els teus dies al calendari.",
    label_your_name: "El teu nom",
    placeholder_your_name: "p. ex. Gerard",
    label_pick_available: "Clica qualsevol data al calendari",
    legend_available: "Disponible",
    legend_tentative: "Tentatiu",
    legend_badge_hint: "El número indica quanta gent ja ha marcat aquest dia",
    plusone_label: "Portaré un +1",
    btn_save: "Desar la meva disponibilitat",
    btn_remove: "Eliminar la meva resposta",

    results_title: "Resultats",
    results_sub: "Com més fosc el verd, més gent disponible. Els números mostren el total d'assistents (inclosos +1).",
    legend_none: "Ningú encara",
    legend_some: "Alguns disponibles",
    legend_all: "Tothom disponible",
    ranking_title: "Classificació",
    no_responses: "Encara no hi ha respostes.",
    approve_btn: "Aprovar aquesta data",
    approved_tag: "Aprovada",
    approved_banner: (d) => `✅ Data confirmada: ${d}`,
    unapprove_btn: "Desmarcar aprovació",

    people_title: "Qui ha respost",
    no_people: "Ningú encara.",

    calendar_google: "Google Calendar",
    calendar_ics: "Apple / iPhone Calendar",
    add_to_calendar: "Afegir al calendari",

    footer_event_hint: "Comparteix l'enllaç d'aquesta pàgina amb els teus amics perquè també afegeixin la seva disponibilitat.",

    toast_need_name: "Introdueix el teu nom",
    toast_need_date: "Selecciona almenys una data disponible",
    toast_saved: (n) => `Desat! Gràcies ${n}`,
    toast_save_error: "Error en desar. Revisa la configuració de Firebase.",
    toast_enter_prev_name: "Introdueix el nom que vas usar abans",
    toast_removed: "Resposta eliminada.",
    toast_remove_error: "Error en eliminar la resposta.",
    toast_need_event_name: "Introdueix un nom per a l'esdeveniment",
    toast_need_candidate_date: "Clica almenys una data candidata al calendari",
    toast_event_created: "Esdeveniment creat!",
    toast_create_error: "Error creant l'esdeveniment. Revisa la configuració de Firebase.",
    toast_approved: (d) => `Data aprovada: ${d}`,
    toast_unapproved: "Aprovació eliminada.",

    gate_title: "Zona privada",
    gate_sub: "Introdueix la contrasenya per continuar.",
    gate_placeholder: "Contrasenya",
    gate_button: "Entrar",
    gate_error: "Contrasenya incorrecta, torna-ho a provar.",


    upcoming_title: "Pròxims esdeveniments",
    upcoming_sub: "Esdeveniments amb data confirmada.",
    voting_title: "En votació",
    no_upcoming: "Encara no hi ha cap data confirmada.",
    label_time_optional: "Hora (opcional)",
    label_location_optional: "Ubicació",
    placeholder_location: "p. ex. Casa d'en Marc",
    view_attendees: "Veure assistents",
    hide_attendees: "Amagar assistents",
    attendees_count: (n) => `${n} assistent(s)`,

    btn_delete_event: "Eliminar",
    confirm_delete_event: "Vols eliminar aquest esdeveniment? Aquesta acció no es pot desfer.",
    toast_event_deleted: "Esdeveniment eliminat.",
    toast_delete_error: "Error eliminant l'esdeveniment.",
    label_confirmed_date_toggle: "Ja tinc una data confirmada",
    label_date: "Data",
    label_multi_day_toggle: "Diversos dies (p. ex. un viatge)",
    label_day_mode: "Quin tipus d'esdeveniment és?",
    day_mode_single: "Un dia",
    day_mode_single_sub: "una data concreta",
    day_mode_multi: "Diversos dies",
    day_mode_multi_sub: "p. ex. un viatge",
    label_end_date: "Data de fi",
    label_choose_emoji: "Tria una icona (opcional)",
    pickmode_available: "Disponible",
    pickmode_tentative: "Tentatiu",

    btn_edit: "Editar",
    btn_done: "Fet",
    btn_cancel: "Cancel·lar",
    no_time_set: "Sense hora",
    no_location_set: "Sense ubicació",

    locale_code: "ca-ES"
  },

  es: {
    nav_new_event: "Nuevo evento",
    nav_events: "Eventos",
    nav_availability: "Mi disponibilidad",
    nav_results: "Resultados",
    nav_people: "Quién viene",
    back_to_site: "Volver al sitio",
    back_all_events: "Todos los eventos",

    hero_title: "Planifica tu próxima reunión",
    hero_intro: "Crea un evento, propón fechas y comparte el enlace con tus amigos para que marquen cuándo están libres. Verás al instante qué fecha funciona mejor para el grupo.",
    btn_create_event: "Crear evento",
    btn_see_events: "Ver eventos",

    create_title: "Crear un nuevo evento",
    create_sub: "Dale un nombre y propón algunas fechas candidatas en el calendario.",
    label_event_name: "Nombre del evento",
    placeholder_event_name: "p. ej. Cena de Navidad",
    label_pick_dates: "Fechas candidatas — haz clic en los días del calendario",
    btn_create: "Crear evento",
    btn_create_vote: "Crear evento y empezar votación",
    vote_count_label: "persona ha votado|personas han votado",

    events_title: "Eventos",
    events_sub: "Abre un evento para añadir tu disponibilidad o ver los resultados.",
    loading_events: "Cargando eventos…",
    no_events: "Todavía no hay eventos. ¡Crea el primero!",
    footer_hint: "Los datos se sincronizan en tiempo real con Firebase. Comparte el enlace de un evento con tus amigos.",
    chip_open: "Abrir →",
    btn_vote: "Votar",
    no_votes_yet: "Nadie ha votado todavía",
    ev_dates_count: (n) => `${n} fecha(s) candidata(s)`,
    ev_status_voting: "En votación",
    ev_status_approved: "Fecha confirmada ✅",

    availability_title: "Tu disponibilidad",
    availability_sub: "Introduce tu nombre, elige \u201cDisponible\u201d o \u201cTentativo\u201d y marca tus días en el calendario.",
    label_your_name: "Tu nombre",
    placeholder_your_name: "p. ej. Gerard",
    label_pick_available: "Haz clic en cualquier fecha del calendario",
    legend_available: "Disponible",
    legend_tentative: "Tentativo",
    legend_badge_hint: "El número indica cuánta gente ya ha marcado ese día",
    plusone_label: "Traeré un +1",
    btn_save: "Guardar mi disponibilidad",
    btn_remove: "Eliminar mi respuesta",

    results_title: "Resultados",
    results_sub: "Cuanto más oscuro el verde, más gente disponible. Los números muestran el total de asistentes (incluidos +1).",
    legend_none: "Nadie todavía",
    legend_some: "Algunos disponibles",
    legend_all: "Todos disponibles",
    ranking_title: "Clasificación",
    no_responses: "Todavía no hay respuestas.",
    approve_btn: "Aprobar esta fecha",
    approved_tag: "Aprobada",
    approved_banner: (d) => `✅ Fecha confirmada: ${d}`,
    unapprove_btn: "Quitar aprobación",

    people_title: "Quién ha respondido",
    no_people: "Nadie todavía.",

    calendar_google: "Google Calendar",
    calendar_ics: "Apple / iPhone Calendar",
    add_to_calendar: "Añadir al calendario",

    footer_event_hint: "Comparte el enlace de esta página con tus amigos para que también añadan su disponibilidad.",

    toast_need_name: "Introduce tu nombre",
    toast_need_date: "Selecciona al menos una fecha disponible",
    toast_saved: (n) => `¡Guardado! Gracias ${n}`,
    toast_save_error: "Error al guardar. Revisa la configuración de Firebase.",
    toast_enter_prev_name: "Introduce el nombre que usaste antes",
    toast_removed: "Respuesta eliminada.",
    toast_remove_error: "Error al eliminar la respuesta.",
    toast_need_event_name: "Introduce un nombre para el evento",
    toast_need_candidate_date: "Haz clic en al menos una fecha candidata en el calendario",
    toast_event_created: "¡Evento creado!",
    toast_create_error: "Error al crear el evento. Revisa la configuración de Firebase.",
    toast_approved: (d) => `Fecha aprobada: ${d}`,
    toast_unapproved: "Aprobación eliminada.",

    gate_title: "Zona privada",
    gate_sub: "Introduce la contraseña para continuar.",
    gate_placeholder: "Contraseña",
    gate_button: "Entrar",
    gate_error: "Contraseña incorrecta, inténtalo de nuevo.",


    upcoming_title: "Próximos eventos",
    upcoming_sub: "Eventos con fecha confirmada.",
    voting_title: "En votación",
    no_upcoming: "Todavía no hay ninguna fecha confirmada.",
    label_time_optional: "Hora (opcional)",
    label_location_optional: "Ubicación",
    placeholder_location: "p. ej. Casa de Marc",
    view_attendees: "Ver asistentes",
    hide_attendees: "Ocultar asistentes",
    attendees_count: (n) => `${n} asistente(s)`,

    btn_delete_event: "Eliminar",
    confirm_delete_event: "¿Quieres eliminar este evento? Esta acción no se puede deshacer.",
    toast_event_deleted: "Evento eliminado.",
    toast_delete_error: "Error al eliminar el evento.",
    label_confirmed_date_toggle: "Ya tengo una fecha confirmada",
    label_date: "Fecha",
    label_multi_day_toggle: "Varios días (p. ej. un viaje)",
    label_day_mode: "¿Qué tipo de evento es?",
    day_mode_single: "Un día",
    day_mode_single_sub: "una fecha concreta",
    day_mode_multi: "Varios días",
    day_mode_multi_sub: "p. ej. un viaje",
    label_end_date: "Fecha de fin",
    label_choose_emoji: "Elige un icono (opcional)",
    pickmode_available: "Disponible",
    pickmode_tentative: "Tentativo",

    btn_edit: "Editar",
    btn_done: "Hecho",
    btn_cancel: "Cancelar",
    no_time_set: "Sin hora",
    no_location_set: "Sin ubicación",

    locale_code: "es-ES"
  },

  en: {
    nav_new_event: "New event",
    nav_events: "Events",
    nav_availability: "My availability",
    nav_results: "Results",
    nav_people: "Who's in",
    back_to_site: "Back to site",
    back_all_events: "All events",

    hero_title: "Plan your next get-together",
    hero_intro: "Create an event, propose candidate dates, and share the link with friends so everyone marks when they're free — then see instantly which date works best for the group.",
    btn_create_event: "Create an event",
    btn_see_events: "See existing events",

    create_title: "Create a new event",
    create_sub: "Give it a name and propose a few candidate dates on the calendar.",
    label_event_name: "Event name",
    placeholder_event_name: "e.g. Christmas Dinner",
    label_pick_dates: "Candidate dates — click days on the calendar",
    btn_create: "Create event",
    btn_create_vote: "Create event and start voting",
    vote_count_label: "person has voted|people have voted",

    events_title: "Events",
    events_sub: "Open an event to add your availability or check the current results.",
    loading_events: "Loading events…",
    no_events: "No events yet. Create your first one!",
    footer_hint: "Data syncs live via Firebase. Share an event's link with your friends.",
    chip_open: "Open →",
    btn_vote: "Vote",
    no_votes_yet: "No one has voted yet",
    ev_dates_count: (n) => `${n} candidate date(s)`,
    ev_status_voting: "Voting open",
    ev_status_approved: "Date confirmed ✅",

    availability_title: "Your availability",
    availability_sub: "Enter your name, choose \u201cAvailable\u201d or \u201cTentative\u201d, then mark your days on the calendar.",
    label_your_name: "Your name",
    placeholder_your_name: "e.g. Gerard",
    label_pick_available: "Click any date on the calendar",
    legend_available: "Available",
    legend_tentative: "Tentative",
    legend_badge_hint: "The number shows how many people already picked that day",
    plusone_label: "I'll bring a +1",
    btn_save: "Save my availability",
    btn_remove: "Remove my response",

    results_title: "Results",
    results_sub: "Darker green = more people available. Numbers show total attendees (including +1s).",
    legend_none: "No one yet",
    legend_some: "Some available",
    legend_all: "Everyone available",
    ranking_title: "Ranking",
    no_responses: "No responses yet.",
    approve_btn: "Approve this date",
    approved_tag: "Approved",
    approved_banner: (d) => `✅ Date confirmed: ${d}`,
    unapprove_btn: "Unapprove",

    people_title: "Who has responded",
    no_people: "No one yet.",

    calendar_google: "Google Calendar",
    calendar_ics: "Apple / iPhone Calendar",
    add_to_calendar: "Add to calendar",

    footer_event_hint: "Share this page's link with your friends so they can add their availability too.",

    toast_need_name: "Please enter your name",
    toast_need_date: "Select at least one available date",
    toast_saved: (n) => `Saved! Thanks ${n}`,
    toast_save_error: "Error saving. Check Firebase config.",
    toast_enter_prev_name: "Enter the name you used before",
    toast_removed: "Response removed.",
    toast_remove_error: "Error removing response.",
    toast_need_event_name: "Please enter an event name",
    toast_need_candidate_date: "Click at least one candidate date on the calendar",
    toast_event_created: "Event created!",
    toast_create_error: "Error creating event. Check Firebase config.",
    toast_approved: (d) => `Date approved: ${d}`,
    toast_unapproved: "Approval removed.",

    gate_title: "Private area",
    gate_sub: "Enter the password to continue.",
    gate_placeholder: "Password",
    gate_button: "Enter",
    gate_error: "Incorrect password, try again.",


    upcoming_title: "Upcoming events",
    upcoming_sub: "Events with a confirmed date.",
    voting_title: "Voting open",
    no_upcoming: "No confirmed dates yet.",
    label_time_optional: "Time (optional)",
    label_location_optional: "Location",
    placeholder_location: "e.g. Marc's place",
    view_attendees: "View attendees",
    hide_attendees: "Hide attendees",
    attendees_count: (n) => `${n} attendee(s)`,

    btn_delete_event: "Delete",
    confirm_delete_event: "Delete this event? This action cannot be undone.",
    toast_event_deleted: "Event deleted.",
    toast_delete_error: "Error deleting event.",
    label_confirmed_date_toggle: "I already have a confirmed date",
    label_date: "Date",
    label_multi_day_toggle: "Several days (e.g. a trip)",
    label_day_mode: "What kind of event is it?",
    day_mode_single: "One day",
    day_mode_single_sub: "a single date",
    day_mode_multi: "Several days",
    day_mode_multi_sub: "e.g. a trip",
    label_end_date: "End date",
    label_choose_emoji: "Choose an icon (optional)",
    pickmode_available: "Available",
    pickmode_tentative: "Tentative",

    btn_edit: "Edit",
    btn_done: "Done",
    btn_cancel: "Cancel",
    no_time_set: "No time set",
    no_location_set: "No location set",

    locale_code: "en-US"
  }
};

const STORAGE_KEY = "findadate:lang";
const SUPPORTED = ["ca", "es", "en"];

export function getLocale() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.includes(saved)) return saved;
  return "ca";
}

export function setLocale(lang) {
  if (!SUPPORTED.includes(lang)) lang = "ca";
  localStorage.setItem(STORAGE_KEY, lang);
}

export function t(key, ...args) {
  const lang = getLocale();
  const entry = DICT[lang]?.[key] ?? DICT.ca[key];
  if (typeof entry === "function") return entry(...args);
  return entry ?? key;
}

export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const val = t(key);
    if (typeof val === "string") el.textContent = val;
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    const val = t(key);
    if (typeof val === "string") el.setAttribute("placeholder", val);
  });
}

// Renders both a plain inline pill row (shown on desktop via CSS) AND a
// single "ES ▾" dropdown trigger + popup menu (shown on mobile via CSS) in
// the SAME markup, so there is one source of truth for the active state
// instead of keeping two components in sync. Which one is visually shown
// at a given screen width is pure CSS (see .lang-switcher rules).
export function initLanguageSwitcher(containerId = "lang-switcher") {
  const container = document.getElementById(containerId);
  if (!container) return;
  const current = getLocale();
  container.innerHTML = `
    <button type="button" class="lang-dd-trigger">${current.toUpperCase()} <span class="lang-dd-caret">▾</span></button>
    <div class="lang-dd-menu">
      ${SUPPORTED.map(code => `<button type="button" class="lang-btn ${code === current ? "active" : ""}" data-lang="${code}">${code.toUpperCase()}</button>`).join("")}
    </div>
  `;
  container.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setLocale(btn.dataset.lang);
      window.location.reload();
    });
  });
  const trigger = container.querySelector(".lang-dd-trigger");
  const menu = container.querySelector(".lang-dd-menu");
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) menu.classList.remove("open");
  });
}
