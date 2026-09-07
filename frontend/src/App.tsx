import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { JobsPage } from '@/pages/JobsPage'
import { CreateJobPage } from '@/pages/CreateJobPage'
import { JobDetailsPage } from '@/pages/JobDetailsPage'
import { ApplicantDetailsPage } from '@/pages/ApplicantDetailsPage'
import { CandidatesPage } from '@/pages/CandidatesPage'
import { QuestionBankPage } from '@/pages/QuestionBankPage'
import { CodingQuestionFormPage } from '@/pages/CodingQuestionFormPage'
import { CodingTestsPage } from '@/pages/CodingTestsPage'
import { CodingTestFormPage } from '@/pages/CodingTestFormPage'
import { CandidateLayout } from '@/components/layout/CandidateLayout'
import { CandidateLoginPage } from '@/pages/CandidateLoginPage'
import { CandidateProfilePage } from '@/pages/CandidateProfilePage'
import { CandidateJobsPage } from '@/pages/CandidateJobsPage'
import { CandidateJobDetailsPage } from '@/pages/CandidateJobDetailsPage'
import { CandidateApplicationsPage } from '@/pages/CandidateApplicationsPage'
import { CandidateNotificationsPage } from '@/pages/CandidateNotificationsPage'
import { TestAttemptPage } from '@/pages/TestAttemptPage'
import { TestSubmittedPage } from '@/pages/TestSubmittedPage'
import { HomePage } from '@/pages/HomePage'
import { TopNav } from '@/components/layout/TopNav'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TopNav />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/candidate/register" element={<Navigate to="/register?role=candidate" replace />} />
          <Route path="/candidate/login" element={<CandidateLoginPage />} />
          <Route
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/new" element={<CreateJobPage />} />
            <Route path="/jobs/:id" element={<JobDetailsPage />} />
            <Route path="/jobs/:jobId/applicants/:applicantId" element={<ApplicantDetailsPage />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/question-bank" element={<QuestionBankPage />} />
            <Route path="/question-bank/new" element={<CodingQuestionFormPage />} />
            <Route path="/question-bank/:id/edit" element={<CodingQuestionFormPage />} />
            <Route path="/coding-tests" element={<CodingTestsPage />} />
            <Route path="/coding-tests/new" element={<CodingTestFormPage />} />
            <Route path="/coding-tests/:id/edit" element={<CodingTestFormPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['candidate']}><CandidateLayout /></ProtectedRoute>}>
            <Route path="/candidate/profile" element={<CandidateProfilePage />} />
            <Route path="/candidate/jobs" element={<CandidateJobsPage />} />
            <Route path="/candidate/jobs/:id" element={<CandidateJobDetailsPage />} />
            <Route path="/candidate/applications" element={<CandidateApplicationsPage />} />
            <Route path="/candidate/notifications" element={<CandidateNotificationsPage />} />
          </Route>
          <Route path="/test/attempt/:token/submitted" element={<ProtectedRoute allowedRoles={['candidate']}><TestSubmittedPage /></ProtectedRoute>} />
          <Route path="/test/attempt/:token" element={<ProtectedRoute allowedRoles={['candidate']}><TestAttemptPage /></ProtectedRoute>} />
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
