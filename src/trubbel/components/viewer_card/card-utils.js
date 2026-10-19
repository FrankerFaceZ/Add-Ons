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
    console.warn("ViewerCards: Report modal unavailable");
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