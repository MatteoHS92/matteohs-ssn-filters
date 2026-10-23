(function () {
  "use strict";
  try {
    var root = document.body || document.documentElement;
    var badge = document.createElement("div");
    badge.textContent = "MATTEOHS — FILTRO JS BUILD SHARE1";
    badge.setAttribute("aria-hidden", "true");
    badge.style.cssText = "position:fixed;top:8px;left:8px;z-index:2147483647;margin:0;padding:4px 8px;border-radius:4px;background:rgba(0,0,0,0.72);color:#EFEFF1;font:12px/16px Inter,sans-serif;pointer-events:none;user-select:none;";
    var reason = document.createElement("div");
    reason.textContent = "MHS in attesa di un messaggio !";
    reason.setAttribute("aria-hidden", "true");
    reason.style.cssText = "position:fixed;top:34px;left:8px;z-index:2147483647;max-width:calc(100% - 16px);margin:0;padding:4px 8px;border-radius:4px;background:rgba(0,0,0,0.72);color:#EFEFF1;font:12px/16px Inter,sans-serif;pointer-events:none;user-select:none;white-space:pre-wrap;";
    root.appendChild(badge);
    root.appendChild(reason);
    setTimeout(function () {
      if (badge.parentNode) badge.parentNode.removeChild(badge);
      if (reason.parentNode) reason.parentNode.removeChild(reason);
    }, 30000);

    function note(text) { reason.textContent = text; }
    function clip(value) {
      value = String(value || "");
      return value.length > 80 ? value.slice(0, 80) + "…" : value;
    }

    var COMMANDS = {
      "!1000": 1, "!alexa": 1, "!bono": 1, "!citare": 1, "!denti": 1,
      "!diavolo": 1, "!indirettamente": 1, "!indirettamente2": 1,
      "!intrattenimento": 1, "!olio": 1, "!preciso": 1, "!pupazzo": 1,
      "!rentronata": 1, "!schermo": 1, "!vicina": 1, "!zippa": 1,
      "!ariete": 1, "!padre": 1, "!comandi": 1
    };
    var SHARE_BODIES = {
      "shared the live stream": 1,
      "shared the live": 1,
      "shared the live video": 1
    };
    var KEPT_EVENTS = { gift: 1, followed: 1, joined: 1, liked: 1, reward: 1 };

    var params = new URLSearchParams(window.location.search);
    function flag(name, fallback) {
      if (!params.has(name)) return fallback;
      var value = String(params.get(name) || "").trim().toLowerCase();
      if (value === "0" || value === "off" || value === "false") return false;
      if (value === "1" || value === "on" || value === "true") return true;
      return fallback;
    }
    var voiceOn = flag("mhscmd", true);
    var emoteOn = flag("mhsemote", true);
    if (!voiceOn && !emoteOn) return;

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
    function addEmojiText(text, emotes, words) {
      var source = String(text || "");
      var last = 0;
      var match;
      EMOJI_RE.lastIndex = 0;
      while ((match = EMOJI_RE.exec(source))) {
        words.push(source.slice(last, match.index));
        emotes.push("e");
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
            emotes.push("e");
            return;
          }
          if (classText(node).split(/\s+/).indexOf("emoji") !== -1) {
            if ((node.textContent || "").trim()) emotes.push("e");
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
      if (data.contentimg && EMOTE_SRC.test(String(data.contentimg))) emotes.push("e");
      return { count: emotes.length, words: usefulWords(chunks) };
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
    function commandKey(value) {
      return String(value || "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    }
    function visibleCommand(node) {
      var box = node.querySelector && (node.querySelector(".hl-content") || node.querySelector(".hl-message"));
      return commandKey(box ? box.innerText : "");
    }
    function noticeText(value) {
      var raw = String(value || "").replace(/\u00a0/g, " ");
      if (raw.indexOf("<") !== -1) {
        var holder = document.createElement("div");
        holder.innerHTML = raw;
        raw = holder.textContent || "";
      }
      return raw.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[!.?…]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    }
    function eventName(data) {
      if (data.event === true) return "true";
      return String(data.event || "").trim().toLowerCase();
    }
    function isTikTokShareNotice(data, node) {
      if (String(data.type || "").toLowerCase() !== "tiktok") return false;
      if (data.hasDonation || data.donation) return false;
      var name = eventName(data);
      if (KEPT_EVENTS[name]) return false;
      if (name === "share") return true;
      var text = noticeText(messageText(data));
      if (!text && node) text = noticeText(visibleCommand(node));
      var who = noticeText(data.chatname);
      if (who && text.indexOf(who + " ") === 0) text = text.slice(who.length).trim();
      return !!SHARE_BODIES[text];
    }
    function isProtected(data) {
      if (!data) return true;
      var type = String(data.type || "").toLowerCase();
      if (type !== "twitch" && type !== "kick") return true;
      if (data.event) return true;
      if (data.hasDonation || data.donation) return true;
      if (data.contentimg && !EMOTE_SRC.test(String(data.contentimg))) return true;
      return false;
    }
    function hideNode(node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }
    function judge(node, retry) {
      if (!node || node.nodeType !== 1 || node.dataset.mhsDock) return;
      var data = node.rawContents;
      if (!data) {
        if (!retry && !node.dataset.mhsWait) {
          node.dataset.mhsWait = "1";
          requestAnimationFrame(function () { judge(node, true); });
        } else if (retry && node.matches && node.matches(".highlight-chat")) {
          note("MHS senza rawContents | visibile=\"" + clip(visibleCommand(node)) + "\"");
        }
        return;
      }
      node.dataset.mhsDock = "1";
      try {
        if (isTikTokShareNotice(data, node)) {
          note("MHS share nascosta | event=" + eventName(data));
          hideNode(node);
          return;
        }
        var type = String(data.type || "").toLowerCase();
        var body = noticeText(messageText(data));
        if (type === "tiktok" && body.indexOf("shared the live") !== -1) {
          note("MHS share dubbio | event=" + eventName(data) + " | dono=" + String(data.hasDonation || data.donation || "") + " | testo=\"" + clip(body) + "\"");
        }
        var stored = commandKey(messageText(data));
        var visible = visibleCommand(node);
        var looked = stored.charAt(0) === "!" || visible.charAt(0) === "!";
        var key = COMMANDS[stored] ? stored : (COMMANDS[visible] ? visible : "");
        if (isProtected(data)) {
          if (looked) {
            note("MHS tenuto | type=" + String(data.type || "") + " | event=" + String(data.event || "") + " | member=" + String(data.membership || "") + " | dono=" + String(data.hasDonation || data.donation || "") + " | img=" + (data.contentimg ? "si" : "no") + " | salvato=\"" + clip(stored) + "\" | visibile=\"" + clip(visible) + "\"");
          }
          return;
        }
        if (voiceOn && key) {
          note("MHS nascosto | testo=\"" + clip(key) + "\"");
          hideNode(node);
          return;
        }
        if (looked) note("MHS non in lista | salvato=\"" + clip(stored) + "\" | visibile=\"" + clip(visible) + "\"");
        if (!emoteOn) return;
        var info = analyze(data);
        if (info.count > 0 && info.words === 0) {
          note("MHS emote nascosta");
          hideNode(node);
        }
      } catch (e) {
        note("MHS errore | " + clip(e && e.message ? e.message : "eccezione"));
      }
    }
    function visit(node) {
      if (!node || node.nodeType !== 1) return;
      if (node.rawContents || (node.matches && node.matches(".highlight-chat"))) {
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
