import { HashRouter as BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Common/Layout";
import AdminLayout from "./components/Admin/AdminLayout";
import VoterLayout from "./components/Voter/VoterLayout";
import Home from "./pages/Home";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import EmployeeLogin from "./pages/EmployeeLogin";
import VoterDashboard from "./pages/Voter/VoterDashboard";
import VoterLogin from "./pages/Voter/VoterLogin";
import AdminCandidatesList from "./pages/Admin/AdminCandidatesList";
import AdminVotersList from "./pages/Admin/AdminVoterList";
import AdminElectionsList from "./pages/Admin/AdminElectionsList";
import AdminChangePassword from "./pages/Admin/AdminChangePassword";
import MasterAdminDashboard from "./pages/MasterAdmin/MasterAdminDashboard";
import MasterAdminCandidatesList from "./pages/MasterAdmin/MasterAdminCandidatesList";
import MasterAdminVotersList from "./pages/MasterAdmin/MasterAdminVoterList";
import MasterAdminElectionsList from "./pages/MasterAdmin/MasterAdminElectionsList";
import MasterAdminChangePassword from "./pages/MasterAdmin/MasterAdminChangePassword";
import MasterAdminAdminList from "./pages/MasterAdmin/MasterAdminAdminList";
import MasterAdminLayout from "./components/MasterAdmin/MasterAdminLayout";
import NotFound from "./pages/NotFound";
import MasterAdminWardsList from "./pages/MasterAdmin/MasterAdminWardsList";
import MasterAdminElectionPolls from "./pages/MasterAdmin/MasterAdminElectionPolls";
import AdminElectionPolls from "./pages/Admin/AdminElectionPolls";
import AdminWardsList from "./pages/Admin/AdminWardsList";
import IssuesFeedback from "./pages/IssuesFeedback";
import MasterAdminFeedbackList from "./pages/MasterAdmin/MasterAdminFeedbackList";
import AdminFeedbackList from "./pages/Admin/AdminFeedbackList";
import ProtectedVotingRoute from "./pages/Voter/ProtectedVotingRoute"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="/employee-login"
          element={
            <Layout>
              <EmployeeLogin />
            </Layout>
          }
        />
        <Route
          path="/feedback"
          element={
            <Layout>
              <IssuesFeedback />
            </Layout>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          }
        />
        <Route
          path="/admin-candidate-list"
          element={
            <AdminLayout>
              <AdminCandidatesList />
            </AdminLayout>
          }
        />
        <Route
          path="/admin-voter-list"
          element={
            <AdminLayout>
              <AdminVotersList />
            </AdminLayout>
          }
        />
        <Route
          path="/admin-election-polls"
          element={
            <AdminLayout>
              <AdminElectionPolls />
            </AdminLayout>
          }
        />
        <Route
          path="/admin-ward-list"
          element={
            <AdminLayout>
              <AdminWardsList />
            </AdminLayout>
          }
        />
        <Route
          path="/admin-election-list"
          element={
            <AdminLayout>
              <AdminElectionsList />
            </AdminLayout>
          }
        />
        <Route
          path="/admin-change-password"
          element={
            <AdminLayout>
              <AdminChangePassword />
            </AdminLayout>
          }
        />
        <Route
          path="/admin-feedback-list"
          element={
            <AdminLayout>
              <AdminFeedbackList />
            </AdminLayout>
          }
        />

        <Route
          path="/masteradmin"
          element={
            <MasterAdminLayout>
              <MasterAdminDashboard />
            </MasterAdminLayout>
          }
        />
        <Route
          path="/masteradmin-admin-list"
          element={
            <MasterAdminLayout>
              <MasterAdminAdminList />
            </MasterAdminLayout>
          }
        />
        <Route
          path="/masteradmin-candidate-list"
          element={
            <MasterAdminLayout>
              <MasterAdminCandidatesList />
            </MasterAdminLayout>
          }
        />
        <Route
          path="/masteradmin-voter-list"
          element={
            <MasterAdminLayout>
              <MasterAdminVotersList />
            </MasterAdminLayout>
          }
        />
        <Route
          path="/masteradmin-election-list"
          element={
            <MasterAdminLayout>
              <MasterAdminElectionsList />
            </MasterAdminLayout>
          }
        />
        <Route
          path="/masteradmin-ward-list"
          element={
            <MasterAdminLayout>
              <MasterAdminWardsList />
            </MasterAdminLayout>
          }
        />
        <Route
          path="/masteradmin-feedback-list"
          element={
            <MasterAdminLayout>
              <MasterAdminFeedbackList />
            </MasterAdminLayout>
          }
        />
        <Route
          path="/masteradmin-change-password"
          element={
            <MasterAdminLayout>
              <MasterAdminChangePassword />
            </MasterAdminLayout>
          }
        />
        <Route
          path="/masteradmin-election-polls"
          element={
            <MasterAdminLayout>
              <MasterAdminElectionPolls />
            </MasterAdminLayout>
          }
        />

        <Route
          path="/voter"
          element={
            <VoterLayout>
              <ProtectedVotingRoute />
            </VoterLayout>
          }
        />
        <Route
          path="/voter-login"
          element={
            <Layout>
              <VoterLogin />
            </Layout>
          }
        />

        <Route
          path="*"
          element={
            <Layout>
              <NotFound />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
