import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Video, Plus, ChevronLeft, ChevronRight, 
  ChevronDown, Check, X, Maximize2, Minimize2, MoreHorizontal, Users, 
  Globe, Phone, Sparkles, AlertCircle, CalendarDays, ExternalLink, Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../utils/api';

export function TeamsConsultationCalendar({
  scheduleSlots = [],
  onReloadSchedule,
  onOpenVideoConsult,
  assignedPatients = [],
  user = null,
  scheduleDoctorId = 'doc_01',
  setScheduleDoctorId = () => {}
}) {
  // Calendar View Mode: 'day' | 'workWeek' | 'week' | 'agenda'
  const [viewMode, setViewMode] = useState('workWeek');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Selected Date Anchor (defaults to today)
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return d;
  });

  // Teams "New Meeting" Scheduling Modal State
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [selectedMeetingForDetails, setSelectedMeetingForDetails] = useState(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [teamsToast, setTeamsToast] = useState(null);

  // Form state for Teams New Meeting modal
  const [meetingForm, setMeetingForm] = useState({
    title: 'Consultation & Clinical Review',
    patientId: 'p_01',
    patientName: 'Priya Sharma',
    doctorId: scheduleDoctorId === 'all' ? 'doc_01' : scheduleDoctorId,
    date: new Date().toISOString().split('T')[0],
    startTime: '11:00 AM',
    endTime: '11:30 AM',
    language: 'Hindi',
    channel: 'General Medicine',
    notes: 'Routine follow-up consultation and vitals check.'
  });

  const showTeamsNotification = (msg, type = 'success') => {
    setTeamsToast({ msg, type });
    setTimeout(() => setTeamsToast(null), 4000);
  };

  // Time Slots Gutter (08:00 AM to 07:00 PM)
  const timeHours = useMemo(() => [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', 
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', 
    '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'
  ], []);

  // Compute days of the current week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(curr.setDate(diffToMonday));
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      const isToday = nextDay.toDateString() === new Date().toDateString();
      days.push({
        dateObj: nextDay,
        dayName: nextDay.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNumber: nextDay.getDate(),
        formattedDate: nextDay.toISOString().split('T')[0],
        monthName: nextDay.toLocaleDateString('en-US', { month: 'short' }),
        isToday
      });
    }
    return days;
  }, [currentDate]);

  // Display days depending on viewMode
  const visibleDays = useMemo(() => {
    if (viewMode === 'day') {
      const isToday = currentDate.toDateString() === new Date().toDateString();
      return [{
        dateObj: currentDate,
        dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNumber: currentDate.getDate(),
        formattedDate: currentDate.toISOString().split('T')[0],
        monthName: currentDate.toLocaleDateString('en-US', { month: 'short' }),
        isToday
      }];
    }
    if (viewMode === 'workWeek') {
      return weekDays.slice(0, 5); // Mon - Fri
    }
    return weekDays; // Mon - Sun
  }, [viewMode, weekDays, currentDate]);

  // Navigate Date
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Header Title Formatting
  const headerDateLabel = useMemo(() => {
    const month = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (viewMode === 'day') {
      return `${currentDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${currentDate.getDate()} ${month}`;
    }
    const startDay = visibleDays[0];
    const endDay = visibleDays[visibleDays.length - 1];
    if (startDay && endDay) {
      return `${startDay.monthName} ${startDay.dayNumber} – ${endDay.monthName} ${endDay.dayNumber}, ${currentDate.getFullYear()}`;
    }
    return month;
  }, [currentDate, viewMode, visibleDays]);

  // Clean and format text helper
  const cleanPatientName = (nameStr) => {
    if (!nameStr) return "Patient";
    const firstPart = nameStr.split('(')[0].trim();
    return firstPart.replace(/[^\w\s.-]/g, '').trim() || "Priya Sharma";
  };

  const formatSymptom = (text) => {
    if (!text) return "Clinical Consultation";
    if (text.includes("") || text.length < 3) return "Comprehensive Follow-up & Vitals Evaluation";
    return text;
  };

  // Helper: Robustly match slot time to hour bucket
  const parseHourBucket = (timeStr) => {
    if (!timeStr) return null;
    const clean = timeStr.trim().toUpperCase();
    const parts = clean.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/);
    if (parts) {
      let hNum = parseInt(parts[1], 10);
      let ampm = parts[3];
      if (!ampm) {
        if (hNum >= 12) {
          ampm = 'PM';
          if (hNum > 12) hNum -= 12;
        } else {
          ampm = 'AM';
          if (hNum === 0) hNum = 12;
        }
      }
      const paddedH = hNum < 10 ? `0${hNum}` : `${hNum}`;
      const target = `${paddedH}:00 ${ampm}`;
      if (timeHours.includes(target)) return target;
    }
    for (const h of timeHours) {
      const baseH = h.split(':')[0];
      const ampm = h.split(' ')[1];
      if (clean.includes(baseH) && clean.includes(ampm)) {
        return h;
      }
    }
    return null;
  };

  // Open "New Meeting" modal pre-filled for a specific time and day
  const handleOpenScheduleSlot = (dayObj, hourStr) => {
    const targetDate = dayObj ? dayObj.formattedDate : new Date().toISOString().split('T')[0];
    const targetHour = hourStr || '10:00 AM';
    
    // Calculate 30 min later
    let endH = targetHour;
    const [hVal, ampm] = targetHour.split(' ');
    const [hNum] = hVal.split(':');
    endH = `${hNum}:30 ${ampm}`;

    setMeetingForm({
      title: 'Consultation & Clinical Review',
      patientId: assignedPatients[0]?.id || 'p_01',
      patientName: assignedPatients[0]?.name || 'Priya Sharma',
      doctorId: scheduleDoctorId === 'all' ? (user?.doctorId || 'doc_01') : scheduleDoctorId,
      date: targetDate,
      startTime: targetHour,
      endTime: endH,
      language: 'Hindi',
      channel: 'General Medicine',
      notes: 'Consultation scheduled via Microsoft Teams calendar.'
    });
    setIsNewMeetingModalOpen(true);
  };

  // Submit Teams New Meeting Form
  const handleSaveMeeting = async (e) => {
    e.preventDefault();
    setIsBookingSubmitting(true);
    try {
      const selectedPatient = assignedPatients.find(p => p.id === meetingForm.patientId) || {
        name: meetingForm.patientName || 'Priya Sharma'
      };

      const bookingPayload = {
        patient_id: meetingForm.patientId,
        doctor_id: meetingForm.doctorId || 'doc_01',
        slot_time: meetingForm.startTime,
        date: meetingForm.date,
        symptoms: `${meetingForm.title} - ${meetingForm.notes}`,
        preferred_language: meetingForm.language.toLowerCase()
      };

      const res = await api.bookAppointment(bookingPayload);
      if (res) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
        showTeamsNotification(`Consultation scheduled for ${selectedPatient.name} on ${meetingForm.date} at ${meetingForm.startTime}!`);
        setIsNewMeetingModalOpen(false);
        if (onReloadSchedule) {
          onReloadSchedule();
        }
      }
    } catch (err) {
      console.error('Failed to schedule meeting:', err);
      showTeamsNotification('Failed to schedule meeting. Please verify slot.', 'error');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Handle Cancel Appointment
  const handleCancelMeeting = async (aptId) => {
    if (!aptId) return;
    try {
      await api.cancelAppointment(aptId);
      showTeamsNotification('Consultation cancelled successfully.');
      setSelectedMeetingForDetails(null);
      if (onReloadSchedule) {
        onReloadSchedule();
      }
    } catch (err) {
      console.error('Cancel failed:', err);
      showTeamsNotification('Could not cancel consultation.', 'error');
    }
  };

  // Quick "Meet Now" handler
  const handleMeetNow = () => {
    const cleanPatient = (assignedPatients[0]?.name || "Priya Sharma");
    onOpenVideoConsult("consult_instant_" + Date.now(), user?.name || "Dr. Rajesh Rao", cleanPatient);
    showTeamsNotification("Instant Consultation Room Launched!");
  };

  // Helper to color-code consultations like Microsoft Teams
  const getMeetingTheme = (slot) => {
    const text = (slot.patient || '') + (slot.symptoms || '');
    if (text.toLowerCase().includes('cardio') || text.toLowerCase().includes('heart')) {
      return {
        bg: 'bg-[#EBF7F6] hover:bg-[#DFF1EF]',
        border: 'border-l-[#008272]',
        pillBg: 'bg-[#008272]/10 text-[#008272]',
        accent: '#008272'
      };
    }
    if (text.toLowerCase().includes('post-op') || text.toLowerCase().includes('wound')) {
      return {
        bg: 'bg-[#F0F1FA] hover:bg-[#E6E8F7]',
        border: 'border-l-[#5B5FC7]',
        pillBg: 'bg-[#5B5FC7]/10 text-[#5B5FC7]',
        accent: '#5B5FC7'
      };
    }
    if (text.toLowerCase().includes('emergency') || text.toLowerCase().includes('high risk')) {
      return {
        bg: 'bg-[#FDF3F2] hover:bg-[#FCEAE8]',
        border: 'border-l-[#D83B01]',
        pillBg: 'bg-[#D83B01]/10 text-[#D83B01]',
        accent: '#D83B01'
      };
    }
    return {
      bg: 'bg-[#F0F1FA] hover:bg-[#E6E8F7]',
      border: 'border-l-[#5B5FC7]',
      pillBg: 'bg-[#5B5FC7]/10 text-[#5B5FC7]',
      accent: '#5B5FC7'
    };
  };

  // Get booked slots for a given day
  const getSlotsForDay = (dayObj) => {
    return scheduleSlots.filter(s => {
      if (s.status !== 'Booked') return false;
      // If s has date, check match
      if (s.date && s.date !== 'Today') {
        return s.date === dayObj.formattedDate;
      }
      // If date is "Today", match against today's dateObj
      return dayObj.isToday;
    });
  };

  return (
    <div className={`transition-all duration-300 ${
      isFullscreen 
        ? 'fixed inset-0 z-50 bg-white p-4 md:p-6 overflow-y-auto flex flex-col shadow-2xl' 
        : 'rounded-3xl bg-white border border-slate-200/80 shadow-soft overflow-hidden flex flex-col'
    }`}>
      
      {/* Teams Toast Banner */}
      {teamsToast && (
        <div className={`px-4 py-2 text-xs font-bold text-white flex items-center justify-between transition-all ${
          teamsToast.type === 'error' ? 'bg-red-600' : 'bg-[#5B5FC7]'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{teamsToast.msg}</span>
          </div>
          <button onClick={() => setTeamsToast(null)} className="hover:opacity-80 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MICROSOFT TEAMS TOP COMMAND BAR                                           */}
      {/* ========================================================================= */}
      <div className="bg-[#FAF9F8] border-b border-[#EDEBE9] px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
        
        {/* Left: Teams Brand Badge & Navigation */}
        <div className="flex items-center gap-3">
          {/* Teams Calendar Logo & Title */}
          <div className="flex items-center gap-2 pr-2 border-r border-[#EDEBE9]">
            <div className="w-8 h-8 rounded-lg bg-[#5B5FC7] text-white flex items-center justify-center shadow-xs font-black text-sm">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-[#242424]">Teams Calendar</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#5B5FC7]/10 text-[#5B5FC7]">
                  Consultations
                </span>
              </div>
              <p className="text-[11px] text-[#616161] font-medium hidden sm:block">
                Microsoft Teams clinical scheduling & video coordination
              </p>
            </div>
          </div>

          {/* Date Nav Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-md border border-[#D1D1D1] bg-white hover:bg-[#F3F2F1] text-xs font-semibold text-[#242424] transition shadow-2xs active:scale-95 cursor-pointer"
            >
              Today
            </button>
            <div className="flex items-center bg-white border border-[#D1D1D1] rounded-md shadow-2xs">
              <button
                onClick={handlePrev}
                title="Previous period"
                className="p-1.5 hover:bg-[#F3F2F1] text-[#424242] transition rounded-l-md cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                title="Next period"
                className="p-1.5 hover:bg-[#F3F2F1] text-[#424242] transition rounded-r-md cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-sm font-extrabold text-[#242424] ml-2 hidden md:block">
              {headerDateLabel}
            </h3>
          </div>
        </div>

        {/* Center / Filter: Doctor Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#EDEBE9] rounded-lg text-xs font-bold shadow-2xs">
          <button
            onClick={() => setScheduleDoctorId('doc_01')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              scheduleDoctorId === 'doc_01'
                ? 'bg-[#5B5FC7] text-white shadow-xs'
                : 'text-[#616161] hover:text-[#242424]'
            }`}
          >
            Dr. Ching
          </button>
          <button
            onClick={() => setScheduleDoctorId('doc_05')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              scheduleDoctorId === 'doc_05'
                ? 'bg-[#5B5FC7] text-white shadow-xs'
                : 'text-[#616161] hover:text-[#242424]'
            }`}
          >
            Dr. Rajesh
          </button>
          <button
            onClick={() => setScheduleDoctorId('all')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              scheduleDoctorId === 'all'
                ? 'bg-[#5B5FC7] text-white shadow-xs'
                : 'text-[#616161] hover:text-[#242424]'
            }`}
          >
            All Bookings
          </button>
        </div>

        {/* Right: View Switcher & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View Switcher Segments (Day | Work Week | Week | Agenda) */}
          <div className="flex items-center bg-white border border-[#D1D1D1] rounded-md p-0.5 shadow-2xs text-xs font-bold">
            <button
              onClick={() => setViewMode('day')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-[#EDEBE9] text-[#242424]'
                  : 'text-[#616161] hover:text-[#242424]'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('workWeek')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                viewMode === 'workWeek'
                  ? 'bg-[#EDEBE9] text-[#242424]'
                  : 'text-[#616161] hover:text-[#242424]'
              }`}
            >
              Work week
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-[#EDEBE9] text-[#242424]'
                  : 'text-[#616161] hover:text-[#242424]'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                viewMode === 'agenda'
                  ? 'bg-[#EDEBE9] text-[#242424]'
                  : 'text-[#616161] hover:text-[#242424]'
              }`}
            >
              Agenda
            </button>
          </div>

          {/* Teams "Meet now" Quick Call Button */}
          <button
            onClick={handleMeetNow}
            title="Start instant video consultation meeting"
            className="px-3 py-1.5 rounded-md border border-[#D1D1D1] bg-white hover:bg-[#F3F2F1] text-xs font-bold text-[#242424] flex items-center gap-1.5 transition shadow-2xs active:scale-95 cursor-pointer"
          >
            <Video className="w-3.5 h-3.5 text-[#5B5FC7]" />
            <span className="hidden sm:inline">Meet now</span>
          </button>

          {/* Teams "+ New meeting" Signature Purple Button */}
          <button
            onClick={() => handleOpenScheduleSlot(visibleDays.find(d => d.isToday) || visibleDays[0], '11:00 AM')}
            className="px-3.5 py-1.5 rounded-md bg-[#5B5FC7] hover:bg-[#4F52B2] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New meeting</span>
            <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
          </button>

          {/* Maximize / Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Expand to Fullscreen"}
            className="p-1.5 rounded-md border border-[#D1D1D1] bg-white hover:bg-[#F3F2F1] text-[#616161] hover:text-[#242424] transition shadow-2xs cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CALENDAR BODY: AGENDA VIEW                                                */}
      {/* ========================================================================= */}
      {viewMode === 'agenda' ? (
        <div className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Upcoming Consultation Schedule • {scheduleSlots.filter(s => s.status === 'Booked').length} Confirmed Appointments
            </h4>
            <span className="text-[11px] text-[#5B5FC7] font-semibold">
              Live Subtitles & AI Translation Enabled
            </span>
          </div>

          <div className="space-y-3">
            {scheduleSlots.map((slot) => {
              const theme = getMeetingTheme(slot);
              const cleanPatient = (slot.patient || "Patient").split('(')[0].trim();
              const isBooked = slot.status === 'Booked';

              return (
                <div
                  key={slot.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isBooked 
                      ? `${theme.bg} border-l-4 ${theme.border} border-slate-200 shadow-2xs hover:shadow-sm` 
                      : 'bg-white border-dashed border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Time Badge */}
                    <div className={`w-20 h-12 rounded-lg flex flex-col items-center justify-center font-black text-xs ${
                      isBooked ? 'bg-[#5B5FC7] text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <span>{slot.time}</span>
                      <span className="text-[9px] font-medium opacity-80">{slot.date || 'Today'}</span>
                    </div>

                    {/* Patient & Subject Details */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-[#242424]">
                          {isBooked ? slot.patient : 'Open Consultation Slot'}
                        </span>
                        {slot.doctor_name && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5B5FC7]/10 text-[#5B5FC7] font-bold">
                            {slot.doctor_name}
                          </span>
                        )}
                        {isBooked && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Confirmed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        {slot.lang && (
                          <span className="text-[11px] font-semibold text-[#5B5FC7] flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {slot.lang}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          Teams Channel: Clinical Video Room
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isBooked ? (
                      <>
                        <button
                          onClick={() => setSelectedMeetingForDetails(slot)}
                          className="px-3 py-1.5 rounded-md border border-[#D1D1D1] bg-white hover:bg-[#F3F2F1] text-xs font-semibold text-[#242424] transition shadow-2xs cursor-pointer"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => onOpenVideoConsult(slot.consultation_id || "consult_01", user?.name || slot.doctor_name, cleanPatient)}
                          className="px-4 py-2 rounded-md bg-[#5B5FC7] hover:bg-[#4F52B2] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleOpenScheduleSlot(null, slot.time)}
                        className="px-3.5 py-1.5 rounded-md border border-dashed border-[#5B5FC7] text-[#5B5FC7] hover:bg-[#5B5FC7]/10 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Book Slot</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (

        /* ========================================================================= */
        /* CALENDAR BODY: TEAMS TIME GRID (DAY, WORK WEEK, FULL WEEK)                */
        /* ========================================================================= */
        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-[460px] flex flex-col bg-white select-none">
          
          {/* Day Column Headers */}
          <div className="grid border-b border-[#EDEBE9] bg-[#FAF9F8] sticky top-0 z-20" style={{
            gridTemplateColumns: `70px repeat(${visibleDays.length}, minmax(${viewMode === 'day' ? '300px' : '160px'}, 1fr))`
          }}>
            {/* Timezone cell in top-left */}
            <div className="p-2.5 text-center border-r border-[#EDEBE9] flex flex-col items-center justify-center">
              <span className="text-[10px] font-black text-[#616161]">IST</span>
              <span className="text-[9px] text-[#8A8886]">UTC+5:30</span>
            </div>

            {/* Day Headers */}
            {visibleDays.map((day) => (
              <div 
                key={day.formattedDate} 
                className={`py-2 px-3 text-center border-r border-[#EDEBE9] last:border-r-0 flex flex-col items-center justify-center transition ${
                  day.isToday ? 'bg-[#5B5FC7]/5' : ''
                }`}
              >
                <span className={`text-[11px] font-bold ${
                  day.isToday ? 'text-[#5B5FC7]' : 'text-[#616161]'
                }`}>
                  {day.dayName}
                </span>
                
                {/* Date circle badge: Teams signature filled purple circle for today */}
                <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition ${
                  day.isToday 
                    ? 'bg-[#5B5FC7] text-white shadow-xs ring-2 ring-[#5B5FC7]/20' 
                    : 'text-[#242424] hover:bg-[#EDEBE9]'
                }`}>
                  {day.dayNumber}
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid Rows */}
          <div className="flex-1 relative">
            
            {/* Horizontal Current Time Indicator Line (Microsoft Teams red/purple "Now" line) */}
            {visibleDays.some(d => d.isToday) && (
              <div 
                className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                style={{
                  top: '38%', // Positioned during midday clinic hours
                }}
              >
                <div className="w-[70px] flex justify-end pr-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#C4314B] shadow-xs ring-2 ring-white" />
                </div>
                <div className="flex-1 h-[2px] bg-[#C4314B]" />
              </div>
            )}

            {/* Hourly Row Grid */}
            {timeHours.map((hour) => (
              <div
                key={hour}
                className="grid border-b border-[#F3F2F1] min-h-[76px] group/row"
                style={{
                  gridTemplateColumns: `70px repeat(${visibleDays.length}, minmax(${viewMode === 'day' ? '300px' : '160px'}, 1fr))`
                }}
              >
                {/* Time Gutter Label */}
                <div className="py-2 pr-3 text-right text-[11px] font-semibold text-[#616161] border-r border-[#EDEBE9] bg-[#FAF9F8]/60 flex flex-col justify-start">
                  <span>{hour}</span>
                </div>

                {/* Day Slot Cells */}
                {visibleDays.map((day) => {
                  const daySlots = getSlotsForDay(day);
                  const matchedSlots = daySlots.filter(s => parseHourBucket(s.time) === hour);

                  return (
                    <div
                      key={day.formattedDate + hour}
                      className={`relative border-r border-[#F3F2F1] last:border-r-0 p-1 group/cell transition-colors ${
                        day.isToday ? 'bg-[#FAF9F8]/40' : 'hover:bg-[#FAF9F8]/50'
                      }`}
                    >
                      {matchedSlots.length > 0 ? (
                        <div className="space-y-1.5 h-full w-full overflow-y-auto">
                          {matchedSlots.map((matchedSlot) => {
                            const theme = getMeetingTheme(matchedSlot);
                            const cleanPatient = cleanPatientName(matchedSlot.patient_name || matchedSlot.patient);
                            const symptomDesc = formatSymptom(matchedSlot.symptoms || (matchedSlot.patient.includes('(') ? matchedSlot.patient.split('(')[1].replace(')', '') : 'Consultation'));

                            return (
                              <div
                                key={matchedSlot.id}
                                onClick={() => setSelectedMeetingForDetails(matchedSlot)}
                                className={`w-full rounded-md p-2 border-l-4 ${theme.border} ${theme.bg} border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group/meeting`}
                              >
                                <div>
                                  {/* Meeting Header */}
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-black text-[#242424] truncate">
                                      {cleanPatient}
                                    </span>
                                    <span className={`text-[8px] font-extrabold px-1 rounded ${theme.pillBg}`}>
                                      {matchedSlot.time}
                                    </span>
                                  </div>

                                  {/* Meeting Subject */}
                                  <p className="text-[10px] text-slate-600 font-medium line-clamp-1 mt-0.5">
                                    {symptomDesc}
                                  </p>
                                </div>

                                {/* Footer with Subtitles & Join Button */}
                                <div className="flex items-center justify-between gap-1 mt-1.5 pt-1 border-t border-slate-200/50">
                                  {matchedSlot.lang ? (
                                    <span className="text-[9px] text-[#5B5FC7] font-bold flex items-center gap-0.5 truncate">
                                      <Globe className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{matchedSlot.lang.split('⟷')[0].split('?')[0].trim()}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400">Teams HD</span>
                                  )}

                                  {/* Teams Purple Join Call Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenVideoConsult(matchedSlot.consultation_id || "consult_01", user?.name || matchedSlot.doctor_name, cleanPatient);
                                    }}
                                    className="px-2 py-0.5 rounded bg-[#5B5FC7] hover:bg-[#4F52B2] text-white text-[10px] font-black flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                                    title="Join Teams Video Consultation"
                                  >
                                    <Video className="w-2.5 h-2.5" />
                                    <span>Join</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Empty Slot Hover Trigger */
                        <button
                          onClick={() => handleOpenScheduleSlot(day, hour)}
                          className="w-full h-full rounded opacity-0 group-hover/cell:opacity-100 border border-dashed border-[#5B5FC7]/40 bg-[#5B5FC7]/5 hover:bg-[#5B5FC7]/15 flex items-center justify-center gap-1 text-[10px] font-bold text-[#5B5FC7] transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Schedule</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MICROSOFT TEAMS "NEW MEETING" SCHEDULING DIALOG                     */}
      {/* ========================================================================= */}
      {isNewMeetingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            
            {/* Teams Modal Header Bar */}
            <div className="bg-[#5B5FC7] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-white" />
                <h3 className="font-extrabold text-sm tracking-wide">
                  New meeting • Schedule Consultation
                </h3>
              </div>
              <button
                onClick={() => setIsNewMeetingModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Teams Form */}
            <form onSubmit={handleSaveMeeting} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Meeting Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Consultation Title / Subject *
                </label>
                <input
                  type="text"
                  required
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  placeholder="e.g. Post-Op Wound Review & Medication Reconciliation"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#5B5FC7] focus:ring-2 focus:ring-[#5B5FC7]/20 text-xs font-semibold text-slate-800 outline-none transition"
                />
              </div>

              {/* Patient / Required Attendees */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#5B5FC7]" />
                  <span>Required Attendee (Patient) *</span>
                </label>
                <select
                  value={meetingForm.patientId}
                  onChange={(e) => {
                    const selected = assignedPatients.find(p => p.id === e.target.value);
                    setMeetingForm({
                      ...meetingForm,
                      patientId: e.target.value,
                      patientName: selected?.name || 'Priya Sharma',
                      language: selected?.spokenLang?.includes('Kannada') ? 'Kannada' : 'Hindi'
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#5B5FC7] focus:ring-2 focus:ring-[#5B5FC7]/20 text-xs font-semibold text-slate-800 outline-none transition bg-white"
                >
                  {assignedPatients.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.gender}, Age {pt.age}) — {pt.diagnosis.split('&')[0]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Range Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#5B5FC7] text-xs font-semibold text-slate-800 outline-none transition"
                  />
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Time *
                  </label>
                  <select
                    value={meetingForm.startTime}
                    onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#5B5FC7] text-xs font-semibold text-slate-800 outline-none transition bg-white"
                  >
                    {timeHours.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Time *
                  </label>
                  <select
                    value={meetingForm.endTime}
                    onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#5B5FC7] text-xs font-semibold text-slate-800 outline-none transition bg-white"
                  >
                    {timeHours.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Language Pair & Subtitles Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-[#5B5FC7]" />
                    <span>Live AI Subtitles Language *</span>
                  </label>
                  <select
                    value={meetingForm.language}
                    onChange={(e) => setMeetingForm({ ...meetingForm, language: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#5B5FC7] text-xs font-semibold text-slate-800 outline-none transition bg-white"
                  >
                    <option value="Hindi">Hindi ⟷ English (हिन्दी)</option>
                    <option value="Kannada">Kannada ⟷ English (ಕನ್ನಡ)</option>
                    <option value="Tamil">Tamil ⟷ English (தமிழ்)</option>
                    <option value="Telugu">Telugu ⟷ English (తెలుగు)</option>
                    <option value="Bengali">Bengali ⟷ English (বাংলা)</option>
                    <option value="Marathi">Marathi ⟷ English (मराठी)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Consultation Room / Department
                  </label>
                  <select
                    value={meetingForm.channel}
                    onChange={(e) => setMeetingForm({ ...meetingForm, channel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#5B5FC7] text-xs font-semibold text-slate-800 outline-none transition bg-white"
                  >
                    <option value="General Medicine">General Medicine</option>
                    <option value="Cardiology">Cardiology Follow-Up</option>
                    <option value="Post-Op Wound Care">Post-Op Wound Care</option>
                    <option value="Emergency SOS Follow-up">Emergency SOS Follow-up</option>
                  </select>
                </div>
              </div>

              {/* Agenda / Clinical Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Clinical Agenda & Medical Notes
                </label>
                <textarea
                  rows={3}
                  value={meetingForm.notes}
                  onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                  placeholder="Note symptoms, medication changes, or wound healing questions for the consultation..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-[#5B5FC7] text-xs font-medium text-slate-800 outline-none transition resize-none"
                />
              </div>

              {/* Bottom Actions Bar */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewMeetingModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-[#D1D1D1] hover:bg-[#F3F2F1] text-xs font-semibold text-[#242424] transition cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isBookingSubmitting}
                  className="px-5 py-2 rounded-md bg-[#5B5FC7] hover:bg-[#4F52B2] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isBookingSubmitting ? 'Scheduling...' : 'Save & Schedule'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TEAMS MEETING DETAILS POPOVER                                       */}
      {/* ========================================================================= */}
      {selectedMeetingForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Header with Teams Theme */}
            <div className="bg-[#5B5FC7] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/80">
                  Microsoft Teams Consultation
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  {selectedMeetingForDetails.patient}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMeetingForDetails(null)}
                className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              
              {/* Meeting Meta Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block">Scheduled Time</span>
                  <span className="text-slate-900 font-extrabold">
                    {selectedMeetingForDetails.time} ({selectedMeetingForDetails.date || 'Today'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Doctor / Host</span>
                  <span className="text-[#5B5FC7] font-extrabold">
                    {selectedMeetingForDetails.doctor_name || 'Dr. Rajesh Rao'}
                  </span>
                </div>
              </div>

              {/* Language Subtitles */}
              {selectedMeetingForDetails.lang && (
                <div className="p-3 rounded-xl bg-[#5B5FC7]/10 border border-[#5B5FC7]/20 flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-[#5B5FC7] shrink-0" />
                  <div>
                    <span className="text-xs font-black text-[#5B5FC7]">
                      Live Multilingual Subtitles Active
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Channel: {selectedMeetingForDetails.lang}
                    </p>
                  </div>
                </div>
              )}

              {/* Clinical Snapshot */}
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  Clinical Snapshot & Reason
                </span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedMeetingForDetails.symptoms || "Scheduled consultation via SehatSanketh Teams Calendar for comprehensive clinical evaluation."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                {selectedMeetingForDetails.appointment_id && (
                  <button
                    onClick={() => handleCancelMeeting(selectedMeetingForDetails.appointment_id)}
                    className="px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setSelectedMeetingForDetails(null)}
                    className="px-3.5 py-2 rounded-md border border-[#D1D1D1] hover:bg-[#F3F2F1] text-xs font-semibold text-[#242424] transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const cleanPatient = (selectedMeetingForDetails.patient || "Priya Sharma").split('(')[0].trim();
                      setSelectedMeetingForDetails(null);
                      onOpenVideoConsult(
                        selectedMeetingForDetails.consultation_id || "consult_01", 
                        user?.name || selectedMeetingForDetails.doctor_name, 
                        cleanPatient
                      );
                    }}
                    className="px-5 py-2 rounded-md bg-[#5B5FC7] hover:bg-[#4F52B2] text-white text-xs font-black flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Call</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
