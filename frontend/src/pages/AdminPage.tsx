import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { toIST , formatDateTimeDisplay } from "../utils/dateUtils"
import { useNavigate } from "react-router-dom"
import GuestHistoryManager from "../components/GuestManager"
import logo from "../Images/logo.png";

export default function AdminPage() {


interface StatsType {
  totalRooms: number
  availableRooms: number
  occupiedRooms: number
  currentGuests: number
  checkInsToday: number
  checkOutsToday: number
  revenueToday: number
  revenueWeek: number
  revenueMonth: number
}

interface BookingType {
  id: number | string
  guest_name: string
  room_number: string | number
  check_in: string | null | undefined
  check_out: string | null | undefined
  status: string
  total_amount: number
}

  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
const [stats, setStats] = useState<StatsType | null>(null)
const [bookings, setBookings] = useState<BookingType[]>([])
const [selectedBooking, setSelectedBooking] = useState<BookingType | null>(null)


  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  useEffect(() => {
    async function fetchAdminData() {
      setLoading(true)
      try {
        // Calculations same as your original code
        const now = toIST(new Date())
        const today = now.toISOString().split("T")[0]
        const dayOfWeek = now.getDay();
        const diffToMonday = (dayOfWeek === 0) ? 6 : (dayOfWeek - 1);

        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        monthStart.setHours(0, 0, 0, 0)

        const { data: rooms } = await supabase.from("rooms").select("*")
        const { data: guests } = await supabase.from("guests").select("*").eq("is_primary", true)
        const { data: bookingsData } = await supabase.from("bookings").select("*, rooms(room_number), guests(name)")
        const { data: guestHistory } = await supabase.from("guest_history").select("*").order("checkout_time", { ascending: false })
		
		const historyRows = guestHistory.map(gh => ({
  ...gh,
  total_amount: Number(gh.total_amount) || 0 // This is already GST-inclusive
}));

        const totalRooms = rooms?.length || 0
        const availableRooms = rooms?.filter(r => r.status === "Available").length || 0
        const occupiedRooms = rooms?.filter(r => r.status === "Occupied").length || 0
        const currentGuests = guests?.length || 0

        const checkInsToday = bookingsData?.filter(b => {
          if (!b.checkin_time) return false
          return b.checkin_time.startsWith(today)
        }).length || 0

        const checkOutsToday = guestHistory?.filter(g => {
          if (!g.checkout_time) return false
          return g.checkout_time.startsWith(today)
        }).length || 0

		const revenueToday = guestHistory?.filter(
		g => g.checkout_time?.startsWith(today))
	  .reduce((sum, g) => sum + Number(g.total_amount || 0), 0) || 0


        const revenueWeek = guestHistory?.filter(g => {
          if (!g.checkout_time) return false;
          const checkoutDate = toIST(new Date(g.checkout_time));
          return checkoutDate >= weekStart && checkoutDate <= weekEnd;
        }).reduce((sum, g) => sum + Number(g.gross_total || 0), 0) || 0;

        const revenueMonth = guestHistory?.filter(g => {
          if (!g.checkout_time) return false
          const checkoutDate = new Date(g.checkout_time)
          return checkoutDate >= monthStart && checkoutDate <= now
        }).reduce((sum, g) => sum + Number(g.gross_total || 0), 0) || 0

        setStats({
          totalRooms,
          availableRooms,
          occupiedRooms,
          currentGuests,
          checkInsToday,
          checkOutsToday,
          revenueToday,
          revenueWeek,
          revenueMonth,
        })

        // Active bookings
        const activeBookings = bookingsData?.map(b => ({
          id: b.id,
          guest_name: b.guests?.[0]?.name || "N/A",
          room_number: b.rooms?.room_number || "N/A",
          check_in: b.checkin_time,
          check_out: b.checkout_time,
          status: "Active",
          total_amount: Number(b.gross_total) || 0, 
        })) || []
        setBookings(activeBookings)
      } finally {
        setLoading(false)
      }
    }
    fetchAdminData()
  }, [])

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <p className="text-green-700 text-xl font-medium animate-pulse">Loading admin dashboard...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-tr from-green-200 via-yellow-100 to-green-50">
      {/* Navbar */}
      <nav className="bg-white shadow p-2 flex justify-between items-center sticky top-0 z-5">
			<div className="flex items-center gap-3">
			  <img
				src={logo}
				alt="Hotel Logo"
				className="w-5 h-5 sm:w-12 sm:h-12 md:w-80 md:h-20 object-contain"
			  />
			 
			</div>
		<button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">Logout</button>
      </nav>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Overview Cards */}
       <h2 className="text-2xl font-bold mb-4 text-green-900">Overview</h2>
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
		  <OverviewCard title="Total Rooms" value={stats?.totalRooms ?? 0} icon="🏨" />
		  <OverviewCard title="Available Rooms" value={stats?.availableRooms ?? 0} icon="✅" />
		  <OverviewCard title="Occupied Rooms" value={stats?.occupiedRooms ?? 0} icon="🔴" />
		  <OverviewCard title="Current Guests" value={stats?.currentGuests ?? 0} icon="🧑‍🤝‍🧑" />
		  <OverviewCard title="Check-ins Today" value={stats?.checkInsToday ?? 0} icon="🟢" />
		  <OverviewCard title="Check-outs Today" value={stats?.checkOutsToday ?? 0} icon="🚪" />
		  <OverviewCard title="Revenue Today" value={`₹${(stats?.revenueToday ?? 0).toFixed(2)}`} icon="💸" />
		  <OverviewCard title="Revenue This Week" value={`₹${(stats?.revenueWeek ?? 0).toFixed(2)}`} icon="📅" />
		  <OverviewCard title="Revenue This Month" value={`₹${(stats?.revenueMonth ?? 0).toFixed(2)}`} icon="📆" />
		</div>


        {/* Active Bookings */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-green-900">Active Bookings / Guests</h2>
        </div>
        <div className="overflow-x-auto rounded-lg shadow mb-12">
          <table className="min-w-full bg-white rounded-lg">
            <thead>
              <tr className="bg-green-100 text-green-900">
                <th className="py-2 px-4 font-semibold">Guest</th>
                <th className="py-2 px-4 font-semibold">Room</th>
                <th className="py-2 px-4 font-semibold">Check-in</th>
                <th className="py-2 px-4 font-semibold">Status</th>
                <th className="py-2 px-4 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr
                  key={b.id}
                  className="hover:bg-yellow-100 hover:shadow transition cursor-pointer"
                  onClick={() => setSelectedBooking(b)}
                >
                  <td className="py-2 px-4">{b.guest_name}</td>
                  <td className="py-2 px-4">{b.room_number}</td>
                  <td className="py-2 px-4">{b.check_in ? formatDateTimeDisplay(toIST(new Date(b.check_in))) : "-"}</td>
                  <td className="py-2 px-4">{b.status}</td>
                  <td className="py-2 px-4 font-semibold text-green-900"> ₹{b.total_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Booking Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-all">
            <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md border-t-4 border-yellow-500">
              <h3 className="text-xl font-bold text-green-800 mb-4">Booking Details</h3>
              <div className="space-y-2 text-green-800">
                <p><span className="font-bold">Guest:</span> {selectedBooking.guest_name}</p>
                <p><span className="font-bold">Room:</span> {selectedBooking.room_number}</p>
                <p><span className="font-bold">Check-in:</span> {formatDateTimeDisplay(toIST(new Date(selectedBooking.check_in)))}</p>
                <p><span className="font-bold">Check-out:</span> {selectedBooking.check_out ? formatDateTimeDisplay(toIST(new Date(selectedBooking.check_out))) : "-"}</p>
                <p><span className="font-bold">Status:</span> {selectedBooking.status}</p>
                <p><span className="font-bold">Total Amount:</span> ₹{selectedBooking.total_amount.toFixed(2)}</p>
              </div>
              <button
                className="mt-6 px-5 py-2 bg-yellow-600 text-white rounded shadow hover:bg-yellow-700 transition w-full"
                onClick={() => setSelectedBooking(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Guest History Management */}
        <div className="mt-12">
          <GuestHistoryManager />
        </div>
      </div>
    </div>
  )
}

// Helper card component for overview stats
function OverviewCard({ title, value, icon }) {
  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-r from-green-100 via-yellow-50 to-green-50 rounded-xl p-6 shadow-md border border-yellow-100">
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-xl font-bold text-green-900">{value}</span>
      <span className="text-sm text-green-700 mt-1">{title}</span>
    </div>
  )
}
