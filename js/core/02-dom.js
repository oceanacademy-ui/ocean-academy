(function (OA) {
  'use strict';
  const append = function (parent, child) { if (child == null || child === false) return; if (Array.isArray(child)) return child.forEach(function (item) { append(parent, item); }); parent.append(child instanceof Node ? child : document.createTextNode(String(child))); };
  OA.dom = {
    h: function (tag, props) { const node = document.createElement(tag); const children = Array.prototype.slice.call(arguments, 2); Object.entries(props || {}).forEach(function (entry) { const key = entry[0], value = entry[1]; if (key === 'class') node.className = value; else if (key === 'dataset') Object.assign(node.dataset, value); else if (key.slice(0, 2) === 'on' && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value); else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : value); }); children.forEach(function (child) { append(node, child); }); return node; },
    $: function (selector, root) { return (root || document).querySelector(selector); },
    $$: function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); },
    mount: function (el, node) { el.replaceChildren(node); },
    clear: function (el) { el.replaceChildren(); }
  };
})(window.OA = window.OA || {});
