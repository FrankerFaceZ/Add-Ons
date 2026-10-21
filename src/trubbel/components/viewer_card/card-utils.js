export function formatDate(dateString) {
  if (!dateString) return "";
  var date = new Date(dateString);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function formatTime(dateString) {
  if (!dateString) return "";
  var d = new Date(dateString);
  return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}

export function formatCommentDate(dateString) {
  if (!dateString) return "";
  var d = new Date(dateString);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    ", " + formatTime(dateString);
}

export function withDateSeparators(items, getDate, makeRow) {
  var result = [];
  var lastDay = null;
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var day = new Date(getDate(item)).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    if (day !== lastDay) {
      result.push({ isSeparator: true, date: day, key: "sep-" + day + "-" + i });
      lastDay = day;
    }
    var row = makeRow(item);
    row.isSeparator = false;
    result.push(row);
  }
  return result;
}

export function openReportModal(ffz, reportContext) {
  var site = ffz.resolve("site");
  var web_munch = ffz.resolve("site.web_munch");

  var report_form;
  try {
    report_form = web_munch && web_munch.getModule("user-report");
  } catch (err) {
    report_form = null;
  }

  if (!report_form || !site || !site.store || !site.store.dispatch) {
    console.warn("[ViewerCards] Report modal unavailable");
    return false;
  }

  site.store.dispatch({
    type: "core.modal.MODAL_SHOWN",
    modalComponent: report_form,
    modalProps: { reportContext: reportContext }
  });
  return true;
}

export function formatSince(ffz, dateString) {
  if (!dateString) return "";
  var d = new Date(dateString);
  if (Date.now() - d.getTime() < 864e5) {
    try {
      return ffz.resolve("i18n").toRelativeTime(d);
    } catch (err) { /* */ }
  }
  return formatDate(dateString);
}

export function formatCount(total, hasMore, max) {
  total = total || 0;
  max = max || 99;
  return total > max || hasMore ? Math.min(total, max) + "+" : String(total);
}

function stvColorFromInt(int) {
  var red = int >>> 24 & 0xFF;
  var green = int >>> 16 & 0xFF;
  var blue = int >>> 8 & 0xFF;
  var alpha = int & 0xFF;
  return "rgba(" + red + ", " + green + ", " + blue + ", " + (alpha / 255) + ")";
}

function stvCreateGradient(gradient) {
  var args = [];
  switch (gradient.function) {
    case "LINEAR_GRADIENT": args.push((gradient.angle || 0) + "deg"); break;
    case "RADIAL_GRADIENT": args.push(gradient.shape || "circle"); break;
    case "URL":             args.push(gradient.image_url || ""); break;
  }

  var funcPrefix = "";
  if (gradient.function !== "URL") {
    funcPrefix = gradient.repeat ? "repeating-" : "";
    for (var i = 0; i < gradient.stops.length; i++) {
      var stop = gradient.stops[i];
      args.push(stvColorFromInt(stop.color) + " " + (stop.at * 100) + "%");
    }
  }

  var image = funcPrefix + gradient.function.toLowerCase().replace('_', '-') + "(" + args.join(', ') + ")";
  var pos   = gradient.at && gradient.at.length === 2   ? (gradient.at[0] * 100) + "% " + (gradient.at[1] * 100) + "%" : "";
  var size  = gradient.size && gradient.size.length === 2 ? (gradient.size[0] * 100) + "% " + (gradient.size[1] * 100) + "%" : "";
  var rep   = gradient.canvas_repeat || "unset";

  return [image, pos, size, rep];
}

function stvDropShadow(shadow) {
  return "drop-shadow(" + shadow.x_offset + "px " + shadow.y_offset + "px " + shadow.radius + "px " + stvColorFromInt(shadow.color) + ")";
}

export function paintStyle(paint) {
  var gradients = paint.gradients;
  if (!gradients || !gradients.length) {
    if (paint.function) {
      gradients = [{
        function: paint.function,
        canvas_repeat: "",
        size: [1, 1],
        shape: paint.shape,
        image_url: paint.image_url,
        stops: paint.stops || [],
        repeat: paint.repeat || false,
        angle: paint.angle,
        at: null
      }];
    } else {
      gradients = [];
    }
  }

  var gradientData = gradients.map(stvCreateGradient);
  var filter = paint.shadows && paint.shadows.length
    ? paint.shadows.map(stvDropShadow).join(" ")
    : "";

  var style = {
    color: paint.color ? stvColorFromInt(paint.color) : "inherit",
    backgroundImage: gradientData.map(function(v) { return v[0]; }).join(", ") || "none",
    filter: filter || "inherit",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    fontWeight: "700"
  };

  var pos = gradientData.map(function(v) { return v[1]; }).filter(Boolean).join(", ");
  var size = gradientData.map(function(v) { return v[2]; }).filter(Boolean).join(", ");
  var repeat = gradientData.map(function(v) { return v[3]; }).join(", ");
  if (pos) style.backgroundPosition = pos;
  if (size) style.backgroundSize = size;
  if (repeat) style.backgroundRepeat = repeat;

  if (paint.text) {
    if (paint.text.weight)
      style.fontWeight = String(paint.text.weight * 100);
    if (paint.text.stroke) {
      style.WebkitTextStrokeWidth = paint.text.stroke.width + "px";
      style.WebkitTextStrokeColor = stvColorFromInt(paint.text.stroke.color);
    }
    if (paint.text.shadows && paint.text.shadows.length) {
      style.textShadow = paint.text.shadows
        .map(function(s) { return s.x_offset + "px " + s.y_offset + "px " + s.radius + "px " + stvColorFromInt(s.color); })
        .join(", ");
    }
    if (paint.text.transform)
      style.textTransform = paint.text.transform;
  }

  return style;
}

export function styleToCss(style) {
  return Object.keys(style).map(function(key) {
    var prop = key.replace(/[A-Z]/g, function(c) { return "-" + c.toLowerCase(); });
    return prop + ": " + style[key];
  }).join("; ");
}
