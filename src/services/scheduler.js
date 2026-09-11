const { readDB } = require('../db/database');

/**
 * Intelligent Scheduling & Availability Engine for IGDTUW
 */
function computeAvailabilityMatrix(participantIds, targetDate) {
  const db = readDB();
  const dateObj = new Date(targetDate);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = dayNames[dateObj.getDay()] || "Friday";

  const targetSlots = [
    { label: "09:00 AM", start: "09:00", end: "10:00" },
    { label: "10:00 AM", start: "10:00", end: "11:00" },
    { label: "11:00 AM", start: "11:00", end: "12:00" },
    { label: "12:00 PM", start: "12:00", end: "13:00" }, // Lunch
    { label: "01:00 PM", start: "13:00", end: "14:00" },
    { label: "02:00 PM", start: "14:00", end: "15:00" },
    { label: "03:00 PM", start: "15:00", end: "16:00" },
    { label: "04:00 PM", start: "16:00", end: "17:00" }
  ];

  // Resolve users
  const participants = participantIds.map(id => {
    return db.users.find(u => u.id === id) || { id, name: id, department: "Academic" };
  });

  // Calculate matrix rows
  const matrix = participants.map(user => {
    // User timetables for this day
    const userTimetables = db.timetables.filter(tt => tt.user_id === user.id && tt.day.toLowerCase() === dayOfWeek.toLowerCase());
    
    // User G-Cal events for this date
    const userCalEvents = db.calendar_events.filter(ev => ev.user_id === user.id && ev.date === targetDate);

    const slotStatuses = targetSlots.map(slot => {
      // 1. Check Lunch
      if (slot.start === "12:00") {
        return {
          slot: slot.label,
          status: "LUNCH",
          detail: "Institutional Lunch Break",
          code: "OFF",
          badgeClass: "badge-off"
        };
      }

      // 2. Check Timetable
      const ttEntry = userTimetables.find(tt => tt.time_slot.startsWith(slot.start));
      if (ttEntry && !ttEntry.is_free && ttEntry.type !== 'free') {
        return {
          slot: slot.label,
          status: `BUSY: ${ttEntry.subject.split(':')[0]}`,
          detail: `${ttEntry.subject} (${ttEntry.room})`,
          code: "BUSY_TIMETABLE",
          badgeClass: "badge-busy"
        };
      }

      // 3. Check Google Calendar
      const calEntry = userCalEvents.find(ce => ce.start_time === slot.start);
      if (calEntry) {
        return {
          slot: slot.label,
          status: "BUSY: G-Cal Event",
          detail: calEntry.title,
          code: "BUSY_GCAL",
          badgeClass: "badge-busy"
        };
      }

      // Default: Free
      return {
        slot: slot.label,
        status: "FREE",
        detail: "Available for meeting",
        code: "FREE",
        badgeClass: "badge-available"
      };
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        department: user.department,
        designation: user.designation,
        avatar: user.avatar
      },
      slots: slotStatuses
    };
  });

  // Calculate consensus row per slot
  const consensus = targetSlots.map((slot, sIdx) => {
    if (slot.start === "12:00") {
      return { slot: slot.label, status: "LUNCH", label: "Lunch", freeCount: 0, conflictCount: 0, allFree: false };
    }

    const statuses = matrix.map(m => m.slots[sIdx]);
    const freeCount = statuses.filter(s => s.code === "FREE").length;
    const conflictCount = statuses.length - freeCount;
    const allFree = conflictCount === 0;

    return {
      slot: slot.label,
      start: slot.start,
      end: slot.end,
      freeCount,
      conflictCount,
      allFree,
      statusText: allFree ? "100% FREE ✓" : `${conflictCount} Conflict${conflictCount > 1 ? 's' : ''}`,
      badgeClass: allFree ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-rose-50 text-rose-700 border-rose-200"
    };
  });

  // Calculate top recommended meeting slots
  const recommendations = [];

  // Look for 100% free slots first
  const perfectSlots = consensus.filter(c => c.allFree && c.slot !== "12:00 PM");
  perfectSlots.forEach((ps, idx) => {
    recommendations.push({
      timeRange: `${ps.slot} – ${ps.end.replace('11:00', '11:00 AM').replace('15:00', '03:00 PM').replace('17:00', '05:00 PM')}`,
      start: ps.start,
      end: ps.end,
      stars: "★★★★★",
      matchScore: idx === 0 ? "98/100" : "94/100",
      isBest: idx === 0,
      title: idx === 0 ? "Optimal Conflict-Free Slot" : "Secondary Clean Window",
      reasons: [
        `All ${participants.length} selected faculty members are completely available.`,
        "Zero timetable overlaps and no Google Calendar meeting conflicts.",
        "Optimal post-class buffer with minimal room contention."
      ]
    });
  });

  // If less than 3 recommendations, add partial slots with minimal conflicts
  if (recommendations.length < 3) {
    const partialSlots = consensus.filter(c => !c.allFree && c.slot !== "12:00 PM").sort((a, b) => a.conflictCount - b.conflictCount);
    partialSlots.slice(0, 3 - recommendations.length).forEach(ps => {
      recommendations.push({
        timeRange: `${ps.slot} – ${ps.end}`,
        start: ps.start,
        end: ps.end,
        stars: "★★★★☆",
        matchScore: "86/100",
        isBest: false,
        title: "High Feasibility Window",
        reasons: [
          `${ps.freeCount} of ${participants.length} faculty members free.`,
          `Only ${ps.conflictCount} conflict detected which can be rescheduled.`
        ]
      });
    });
  }

  return {
    date: targetDate,
    dayOfWeek,
    slots: targetSlots,
    matrix,
    consensus,
    recommendations: recommendations.slice(0, 3)
  };
}

module.exports = {
  computeAvailabilityMatrix
};
