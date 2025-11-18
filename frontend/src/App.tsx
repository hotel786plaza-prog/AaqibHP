import { useEffect, useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "./lib/supabaseClient"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Room from "./pages/Checkin/Room"
import SelectRoomPage from "./pages/Checkin/SelectRoomPage"
import GuestInfoPage from "./pages/Checkin/GuestInfoPage"
import BillingPage from "./pages/Checkin/BillingPage"
import ViewGuestsPage from "./pages/ViewGuestsPage"
import EditBookingPage from "./pages/EditBookingPage"
import CheckoutPage from "./pages/Checkout/out"
import ConfirmBillPage from "./pages/Checkout/ConfirmBillingPage"
import FinalCheckOut from "./pages/Checkout/FinalCheckOut"
import AdminPage from "./pages/AdminPage"
import RoleGuard from "./components/RoleGuard"
import { Toaster } from "react-hot-toast";

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  if (loading) return <p>Loading...</p>

  return (
    <BrowserRouter>
	 <Toaster position="top-center" />
      <Routes>
        {/* ✅ Dashboard (billing_desk only) */}
        <Route
          path="/"
          element={
            session ? (
              <RoleGuard allowedRoles={["billing_desk"]}>
                <Dashboard />
              </RoleGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ✅ Admin (owner only) */}
        <Route
          path="/admin"
          element={
            session ? (
              <RoleGuard allowedRoles={["owner"]}>
                <AdminPage />
              </RoleGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ✅ Check-in flow (billing_desk only) */}
        <Route
          path="/checkin"
          element={
            session ? (
              <RoleGuard allowedRoles={["billing_desk"]}>
                <Room />
              </RoleGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/select-room"
          element={
            session ? (
              <RoleGuard allowedRoles={["billing_desk"]}>
                <SelectRoomPage />
              </RoleGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/guest-info"
          element={
            session ? (
              <RoleGuard allowedRoles={["billing_desk"]}>
                <GuestInfoPage />
              </RoleGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/bill-me"
          element={
            session ? (
              <RoleGuard allowedRoles={["billing_desk"]}>
                <BillingPage />
              </RoleGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/view-all"
          element={
            session ? (
              <RoleGuard allowedRoles={["billing_desk"]}>
                <ViewGuestsPage />
              </RoleGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/edit-booking/:id"
          element={
            session ? (
              <RoleGuard allowedRoles={["billing_desk"]}>
                <EditBookingPage />
              </RoleGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ✅ Checkout flow (billing_desk only) */}
        <Route
          path="/checkout"
          element={
            session ? (
              <RoleGuard allowedRoles={["billing_desk"]}>
                <CheckoutPage />
              </RoleGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/checkout/confirm-bill/:bookingId"
          element={
            session ? (
              <RoleGuard allowedRoles={["billing_desk"]}>
                <ConfirmBillPage />
              </RoleGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/checkout/finalize/:id"
          element={
            session ? (
              <RoleGuard allowedRoles={["billing_desk"]}>
                <FinalCheckOut />
              </RoleGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ✅ Login */}
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/" />}
        />

        {/* ✅ Catch-all → redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
