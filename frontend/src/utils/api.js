const API_BASE = '/api';

export async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('sehat_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`Request to ${endpoint} failed:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials) => fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  register: (role, data) => fetchWithAuth(`/auth/register/${role}`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getDemoUsers: () => fetchWithAuth('/auth/demo-users'),

  // Triage
  analyzeSymptom: (patientId, language, symptomText, conversationHistory = []) => 
    fetchWithAuth('/triage/analyze', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: patientId,
        language,
        symptom_text: symptomText,
        conversation_history: conversationHistory
      })
    }),

  // Doctors & Appointments
  getDoctors: (language = null, specialty = null) => {
    const params = new URLSearchParams();
    if (language) params.append('language', language);
    if (specialty) params.append('specialty', specialty);
    return fetchWithAuth(`/doctors/available?${params.toString()}`);
  },
  bookAppointment: (bookingData) => fetchWithAuth('/appointments/book', {
    method: 'POST',
    body: JSON.stringify(bookingData)
  }),
  getDoctorSchedule: (doctorId) => fetchWithAuth(`/doctors/${doctorId}/schedule`),
  cancelAppointment: (appointmentId) => fetchWithAuth(`/appointments/${appointmentId}/cancel`, {
    method: 'POST'
  }),

  // Prescriptions
  getPendingPrescriptions: (doctorId = null) => {
    const query = doctorId ? `?doctor_id=${doctorId}` : '';
    return fetchWithAuth(`/prescriptions/pending${query}`);
  },
  confirmPrescription: (prescId, confirmData) => fetchWithAuth(`/prescriptions/${prescId}/confirm`, {
    method: 'POST',
    body: JSON.stringify(confirmData)
  }),

  // Emergency & Ambulance
  triggerEmergency: (emergencyData) => fetchWithAuth('/emergency/trigger', {
    method: 'POST',
    body: JSON.stringify(emergencyData)
  }),
  getActiveEmergencies: () => fetchWithAuth('/emergency/active'),
  dispatchAmbulance: (emergencyId, ambulanceId) => fetchWithAuth(`/emergency/${emergencyId}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ ambulance_id: ambulanceId })
  }),
  resolveEmergency: (emergencyId) => fetchWithAuth(`/emergency/${emergencyId}/resolve`, {
    method: 'POST'
  }),

  // Hospital Resources
  getHospitalResources: (hospitalId = 'hosp_main') => fetchWithAuth(`/hospital/${hospitalId}/resources`),
  restockMedicine: (medId, quantity = 200) => fetchWithAuth(`/hospital/medicines/${medId}/restock?quantity=${quantity}`, {
    method: 'POST'
  }),

  // Patient Profile & Medication Reminders
  getPatientProfile: (patientId) => fetchWithAuth(`/patients/${patientId}/profile`),
  getPatientRisk: (patientId) => fetchWithAuth(`/patients/${patientId}/risk`),
  takeMedicationAction: (patientId, medId, action) => fetchWithAuth(`/patients/${patientId}/meds/${medId}/action`, {
    method: 'POST',
    body: JSON.stringify({ action })
  }),
  createReminder: (reminderData) => fetchWithAuth('/reminders', {
    method: 'POST',
    body: JSON.stringify(reminderData)
  }),

  // Video Consultation
  getConsultation: (consultId) => fetchWithAuth(`/consultation/${consultId}`),
  postConsultationMessage: (consultId, msg) => fetchWithAuth(`/consultation/${consultId}/message`, {
    method: 'POST',
    body: JSON.stringify(msg)
  }),
  startCall: (callData) => fetchWithAuth('/consultation/call/start', {
    method: 'POST',
    body: JSON.stringify(callData)
  }),
  endCall: (consultId, senderRole = 'participant') => fetchWithAuth('/consultation/call/end', {
    method: 'POST',
    body: JSON.stringify({ consultation_id: consultId, sender_role: senderRole })
  }),
  declineCall: (consultId, patientName = 'Patient') => fetchWithAuth('/consultation/call/decline', {
    method: 'POST',
    body: JSON.stringify({ consultation_id: consultId, patient_name: patientName })
  }),
  getActiveCalls: () => fetchWithAuth('/consultation/call/active'),

  // Patient Notifications
  getPatientNotifications: (patientId) => fetchWithAuth(`/patients/${patientId}/notifications`),
  markNotificationRead: (patientId, notifId) => fetchWithAuth(`/patients/${patientId}/notifications/${notifId}/read`, {
    method: 'POST'
  }),

  // Diagnostic Lab Tests & Instrument Precision
  getLabCatalog: () => fetchWithAuth('/lab-tests/catalog'),
  recommendLaboratories: (testIds) => fetchWithAuth('/lab-tests/recommend-laboratories', {
    method: 'POST',
    body: JSON.stringify({ test_ids: testIds })
  }),
  createPostConsultationOrder: (orderData) => fetchWithAuth('/consultations/post-consultation-order', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),
  selectLaboratory: (selectionData) => fetchWithAuth('/lab-tests/select-lab', {
    method: 'POST',
    body: JSON.stringify(selectionData)
  }),
  getPatientLabOrders: (patientId) => fetchWithAuth(`/lab-tests/orders/patient/${patientId}`),
  getDoctorLabOrders: (doctorId) => fetchWithAuth(`/lab-tests/orders/doctor/${doctorId}`),
  getLabOrder: (orderId) => fetchWithAuth(`/lab-tests/orders/${orderId}`),

  // Multilingual Consultation Feedback
  submitConsultationFeedback: (feedbackData) => fetchWithAuth('/consultation/feedback', {
    method: 'POST',
    body: JSON.stringify(feedbackData)
  }),
  getDoctorConsultationFeedback: (doctorId = 'doc_05') => fetchWithAuth(`/consultation/feedback/doctor/${doctorId}`),
  getAllConsultationFeedback: () => fetchWithAuth('/consultation/feedback/all'),

  // Patient Digital Twin
  analyzeDigitalTwin: (vitals) => fetchWithAuth('/digital-twin/analyze', {
    method: 'POST',
    body: JSON.stringify({
      heart_rate: vitals.heartRate,
      blood_pressure_systolic: vitals.systolicBp,
      blood_pressure_diastolic: vitals.diastolicBp,
      oxygen_saturation: vitals.spo2,
      temperature: vitals.temperature,
      respiratory_rate: vitals.respiratoryRate,
      glucose: vitals.glucose
    })
  }),
  simulateDigitalTwin: (currentVitals, futureVitals) => fetchWithAuth('/digital-twin/simulate', {
    method: 'POST',
    body: JSON.stringify({
      current_vitals: {
        heart_rate: currentVitals.heartRate,
        blood_pressure_systolic: currentVitals.systolicBp,
        blood_pressure_diastolic: currentVitals.diastolicBp,
        oxygen_saturation: currentVitals.spo2,
        temperature: currentVitals.temperature,
        respiratory_rate: currentVitals.respiratoryRate,
        glucose: currentVitals.glucose
      },
      future_vitals: {
        heart_rate: futureVitals.heartRate,
        blood_pressure_systolic: futureVitals.systolicBp,
        blood_pressure_diastolic: futureVitals.diastolicBp,
        oxygen_saturation: futureVitals.spo2,
        temperature: futureVitals.temperature,
        respiratory_rate: futureVitals.respiratoryRate,
        glucose: futureVitals.glucose
      }
    })
  }),
  submitDigitalTwinTreatment: (data) => fetchWithAuth('/digital-twin/submit-treatment-consideration', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};

