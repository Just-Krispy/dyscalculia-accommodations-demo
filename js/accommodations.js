/* accommodations.js — renders the accommodation toggle UI into both the setup
 * screen (#accom-setup) and the in-quiz drawer (#accom-root), and keeps the two
 * copies in sync with DC.store. Classic script (no ES modules).
 */
window.DC = window.DC || {};
(function (DC) {
  'use strict';

  var CONTAINER_IDS = ['accom-setup', 'accom-root'];

  /* Every checkbox we have created, across both containers. */
  var inputs = [];

  /* Guard so programmatic .checked updates never re-enter the change handler.
   * (Setting .checked does not fire `change`, but this keeps us safe if a
   * browser or future edit ever dispatches one.) */
  var applying = false;
  var wired = false;

  /* Group the registry by category, preserving declaration order. */
  function byCategory() {
    var order = [];
    var map = Object.create(null);
    var list = DC.ACCOMMODATIONS || [];
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (!map[a.category]) { map[a.category] = []; order.push(a.category); }
      map[a.category].push(a);
    }
    return order.map(function (cat) { return { category: cat, items: map[cat] }; });
  }

  /* One row: <label class="accom-item"><input type=checkbox><span>…</span></label> */
  function makeItem(a) {
    var label = document.createElement('label');
    label.className = 'accom-item';

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!DC.store.isOn(a.id);
    input.setAttribute('data-accom', a.id);
    input.addEventListener('change', function () {
      if (applying) return;
      DC.store.toggle(a.id, input.checked);
    });

    var text = document.createElement('span');
    var name = document.createElement('strong');
    name.textContent = a.label;
    var desc = document.createElement('span');
    desc.textContent = a.desc;
    text.appendChild(name);
    text.appendChild(desc);

    label.appendChild(input);
    label.appendChild(text);

    inputs.push({ id: a.id, el: input });
    return label;
  }

  /* Single render function for both containers. `isDrawer` adds the drawer
   * chrome (title + close button); the toggle grid itself is identical. */
  function render(container, isDrawer) {
    while (container.firstChild) container.removeChild(container.firstChild);

    var grid = container; /* #accom-setup already carries .accom-grid */
    if (isDrawer) {
      var head = document.createElement('div');
      head.className = 'tool-head';

      var title = document.createElement('h2');
      title.textContent = 'Accommodations';

      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'btn btn-icon';
      close.setAttribute('aria-label', 'Close accommodations panel');
      close.textContent = '\u2715';
      close.addEventListener('click', function () {
        /* app.js owns aria-hidden; just close the drawer. */
        container.classList.remove('open');
      });

      head.appendChild(title);
      head.appendChild(close);
      container.appendChild(head);

      grid = document.createElement('div');
      grid.className = 'accom-grid';
      container.appendChild(grid);
    }

    var note = document.createElement('p');
    note.className = 'hint';
    note.textContent = 'Changes apply instantly \u2014 even mid-quiz.';
    grid.appendChild(note);

    byCategory().forEach(function (group) {
      var section = document.createElement('section');
      section.className = 'accom-cat';

      var heading = document.createElement('h3');
      heading.textContent = group.category;
      section.appendChild(heading);

      group.items.forEach(function (a) { section.appendChild(makeItem(a)); });

      grid.appendChild(section);
    });
  }

  /* Reflect store state into every checkbox. */
  function sync() {
    applying = true;
    try {
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].el.checked = !!DC.store.isOn(inputs[i].id);
      }
    } finally {
      applying = false;
    }
  }

  function init() {
    if (!DC.store || !DC.ACCOMMODATIONS) return;

    inputs.length = 0;

    for (var i = 0; i < CONTAINER_IDS.length; i++) {
      var container = document.getElementById(CONTAINER_IDS[i]);
      if (!container) continue;
      render(container, CONTAINER_IDS[i] === 'accom-root');
    }

    sync();

    if (!wired) {
      DC.bus.on('state:change', sync);
      wired = true;
    }
  }

  DC.accommodations = { init: init };
})(window.DC);