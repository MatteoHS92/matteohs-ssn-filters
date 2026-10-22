(function () {
  "use strict";
  try {
    var badge = document.createElement("div");
    badge.textContent = "MATTEOHS — FILTRO JS CARICATO";
    badge.setAttribute("aria-hidden", "true");
    badge.style.cssText = "position:fixed;top:8px;left:8px;z-index:2147483647;margin:0;padding:4px 8px;border-radius:4px;background:rgba(0,0,0,0.72);color:#EFEFF1;font:12px/16px Inter,sans-serif;pointer-events:none;user-select:none;";
    (document.body || document.documentElement).appendChild(badge);
    setTimeout(function () {
      if (badge.parentNode) badge.parentNode.removeChild(badge);
    }, 30000);

    var COMMANDS = {
      "!1000": 1,
      "!alexa": 1,
      "!bono": 1,
      "!citare": 1,
      "!denti": 1,
      "!diavolo": 1,
      "!indirettamente": 1,
      "!indirettamente2": 1,
      "!intrattenimento": 1,
      "!olio": 1,
      "!preciso": 1,
      "!pupazzo": 1,
      "!rentronata": 1,
      "!schermo": 1,
      "!vicina": 1,
      "!zippa": 1,
      "!ariete": 1,
      "!padre": 1,
      "!comandi": 1
    };

    var params = new URLSearchParams(window.location.search);

    function flag(name, fallback) {
      if (!params.has(name)) return fallback;
      var value = String(params.get(name) || "").trim().toLowerCase();
      if (value === "0" || value === "off" || value === "false") return false;
      if (value === "1" || value === "on" || value === "true") return true;
      return fallback;
    }

    function numberParam(name, fallback, min, max) {
      if (!params.has(name)) return fallback;
      var value = parseFloat(params.get(name));
      if (!isFinite(value)) return fallback;
      if (value < min) return min;
      if (value > max) return max;
      return value;
    }

    var voiceOn = flag("mhscmd", true);
    var emoteOn = flag("mhsemote", true);
    var minEmotes = numberParam("mhsmin", 5, 1, 100);
    var ratio = numberParam("mhsratio", 70, 1, 100) / 100;
    var repeatMin = numberParam("mhsrepeat", 3, 2, 100);
    var almost = numberParam("mhsalmost", 85, 1, 100) / 100;
    var burstCount = numberParam("mhsburst", 3, 2, 20);
    var burstMs = numberParam("mhsburstsec", 10, 1, 120) * 1000;

    if (!voiceOn && !emoteOn) return;

    var recent = new Map();
    var MAX_USERS = 200;
    var MAX_STAMPS = 8;
    var EMOTE_CLASS = /(?:^|\s)(?:regular-emote|zero-width-emote(?:-centered)?|seventv-chat-emote|chat-line__message--emote(?:-gigantified)?|chat-image)(?:\s|$)/i;
    var EMOTE_SRC = /\/emotes\/|\/emoticons\/|betterttv|7tv\.app|7tv\.io|frankerfacez|ffzcdn|jtvnw\.net\/emoticons/i;
    var EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu;

    function classText(el) {
      var value = el.getAttribute && el.getAttribute("class");
      return value ? String(value) : "";
    }

    function isEmoteElement(el) {
      if (!el || el.nodeType !== 1) return false;
      var tag = el.tagName;
      if (tag !== "IMG" && tag !== "SVG") return false;
      var cls = classText(el);
      if (/badge/i.test(cls)) return false;
      if (EMOTE_CLASS.test(cls)) return true;
      if (tag === "IMG") {
        var src = el.getAttribute("src") || el.getAttribute("srcset") || "";
        if (EMOTE_SRC.test(src)) return true;
      }
      return false;
    }

    function emoteKey(el, anon) {
      var name = el.getAttribute("alt") || el.getAttribute("title") || el.getAttribute("aria-label") || "";
      name = String(name).replace(/\s+/g, " ").trim().toLowerCase();
      if (name) return "n:" + name;
      var src = el.getAttribute("src") || "";
      src = String(src).split("?")[0].split("#")[0];
      if (src) return "s:" + src;
      return "anon:" + anon.count++;
    }

    function addEmojiText(text, emotes, words) {
      var source = String(text || "");
      var last = 0;
      var match;
      EMOJI_RE.lastIndex = 0;
      while ((match = EMOJI_RE.exec(source))) {
        words.push(source.slice(last, match.index));
        emotes.push("e:" + match[0]);
        last = match.index + match[0].length;
        if (match.index === EMOJI_RE.lastIndex) EMOJI_RE.lastIndex++;
      }
      words.push(source.slice(last));
    }

    function usefulWords(chunks) {
      var text = chunks.join(" ").replace(/\s+/g, " ").trim();
      if (!text) return 0;
      var parts = text.split(" ");
      var count = 0;
      for (var i = 0; i < parts.length; i++) {
        if (/[\p{L}\p{N}]/u.test(parts[i])) count++;
      }
      return count;
    }

    function analyze(data) {
      var emotes = [];
      var chunks = [];
      var anon = { count: 1 };
      var raw = String(data.chatmessage || "");
      if (data.textonly) {
        addEmojiText(raw, emotes, chunks);
      } else {
        var holder = document.createElement("div");
        holder.innerHTML = raw;
        var walk = function (node) {
          if (!node) return;
          if (node.nodeType === 3) {
            addEmojiText(node.textContent || "", emotes, chunks);
            return;
          }
          if (node.nodeType !== 1) return;
          if (isEmoteElement(node)) {
            emotes.push(emoteKey(node, anon));
            return;
          }
          if (classText(node).split(/\s+/).indexOf("emoji") !== -1) {
            var emojiText = (node.textContent || "").trim();
            if (emojiText) emotes.push("e:" + emojiText);
            return;
          }
          var child = node.firstChild;
          while (child) {
            walk(child);
            child = child.nextSibling;
          }
        };
        walk(holder);
      }
      var words = usefulWords(chunks);
      var total = emotes.length + words;
      var share = total ? emotes.length / total : 0;
      var counts = {};
      var highest = 0;
      for (var i = 0; i < emotes.length; i++) {
        counts[emotes[i]] = (counts[emotes[i]] || 0) + 1;
        if (counts[emotes[i]] > highest) highest = counts[emotes[i]];
      }
      return { count: emotes.length, share: share, highest: highest };
    }

    function messageText(data) {
      var raw = String(data.chatmessage || "").replace(/\u00a0/g, " ");
      if (!data.textonly) {
        var holder = document.createElement("div");
        holder.innerHTML = raw;
        raw = holder.textContent || "";
      }
      return raw.replace(/\s+/g, " ").trim();
    }

    function isProtected(data) {
      if (!data) return true;
      var type = String(data.type || "").toLowerCase();
      if (type !== "twitch" && type !== "kick") return true;
      if (data.event) return true;
      if (data.hasDonation || data.donation) return true;
      if (data.membership) return true;
      if (data.contentimg) return true;
      return false;
    }

    function userKey(data) {
      var name = String(data.chatname || "");
      if (name.indexOf("<") !== -1) {
        var holder = document.createElement("div");
        holder.innerHTML = name;
        name = holder.textContent || "";
      }
      name = name.replace(/\s+/g, " ").trim().toLowerCase();
      if (!name) return "";
      return String(data.type || "").toLowerCase() + "|" + name;
    }

    function remember(data) {
      var key = userKey(data);
      if (!key) return 0;
      var now = Date.now();
      var stamps = recent.get(key) || [];
      var kept = [];
      for (var i = 0; i < stamps.length; i++) {
        if (now - stamps[i] <= burstMs) kept.push(stamps[i]);
      }
      kept.push(now);
      if (kept.length > MAX_STAMPS) kept = kept.slice(kept.length - MAX_STAMPS);
      if (!recent.has(key) && recent.size >= MAX_USERS) {
        var oldest = recent.keys().next().value;
        recent.delete(oldest);
      }
      recent.delete(key);
      recent.set(key, kept);
      return kept.length;
    }

    function hideNode(node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }

    function judge(node) {
      if (!node || node.nodeType !== 1 || node.dataset.mhsDock) return;
      var data = node.rawContents;
      if (!data) return;
      node.dataset.mhsDock = "1";
      try {
        if (isProtected(data)) return;
        if (voiceOn && COMMANDS[messageText(data).toLowerCase()]) {
          hideNode(node);
          return;
        }
        if (!emoteOn) return;
        var info = analyze(data);
        var almostOnly = info.count > 0 && info.share >= almost;
        if ((info.count >= minEmotes && info.share >= ratio) || (info.highest >= repeatMin && almostOnly)) {
          if (almostOnly) remember(data);
          hideNode(node);
          return;
        }
        if (almostOnly && remember(data) >= burstCount) hideNode(node);
      } catch (e) {}
    }

    function visit(node) {
      if (!node || node.nodeType !== 1) return;
      if (node.rawContents) {
        judge(node);
        return;
      }
      if (!node.querySelectorAll) return;
      var rows = node.querySelectorAll(".highlight-chat");
      for (var i = 0; i < rows.length; i++) judge(rows[i]);
    }

    var observer = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) visit(added[j]);
      }
    });

    function arm() {
      var output = document.getElementById("output");
      if (!output) {
        setTimeout(arm, 300);
        return;
      }
      observer.observe(output, { childList: true, subtree: true });
      var rows = output.querySelectorAll(".highlight-chat");
      for (var i = 0; i < rows.length; i++) judge(rows[i]);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", arm, { once: true });
    } else {
      arm();
    }
  } catch (e) {}
})();
