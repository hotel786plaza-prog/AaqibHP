import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { toIST , formatDateTimeDisplay } from "../utils/dateUtils"

interface GuestHistory {
  id: number
  name: string
  room_id: string
  checkin_time: string
  checkout_time: string | null
  gross_total: number
  payment_method: string | null
}

const PAGE_SIZE = 5

export default function GuestHistoryManager() {
  const [history, setHistory] = useState<GuestHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")
  const [filter, setFilter] = useState<"custom" | "weekly" | "monthly" | "yearly">("weekly")
  const [totalPages, setTotalPages] = useState(1)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      let query = supabase.from("guest_history").select("*")

      const now = toIST(new Date())

      if (filter === "weekly") {
        const weekAgo = toIST(new Date())
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte("checkout_time", weekAgo.toISOString())
      } else if (filter === "monthly") {
        const monthStart = toIST(new Date(now.getFullYear(), now.getMonth(), 1))
        query = query.gte("checkout_time", monthStart.toISOString())
      } else if (filter === "yearly") {
        const yearStart = toIST(new Date(now.getFullYear(), 0, 1))
        query = query.gte("checkout_time", yearStart.toISOString())
      } else if (filter === "custom" && fromDate && toDate) {
        const fromISO = new Date(fromDate).toISOString()
        const toISO = new Date(toDate).toISOString()
        query = query.gte("checkout_time", fromISO).lte("checkout_time", toISO)
      }

      const { data, error } = await query.order("checkout_time", { ascending: false })
      if (error) {
        console.error("Error fetching guest history:", error)
      } else {
        setTotalPages(Math.ceil((data?.length || 0) / PAGE_SIZE))
        const start = (page - 1) * PAGE_SIZE
        const end = start + PAGE_SIZE
        setHistory(data?.slice(start, end) || [])
      }
    } catch (err) {
      console.error("Unexpected error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [page, filter, fromDate, toDate])

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this entry?")) return
    try {
      const { error } = await supabase.from("guest_history").delete().eq("id", id)
      if (error) {
        alert("Failed to delete entry")
        return
      }
      setHistory(prev => prev.filter(h => h.id !== id))
    } catch (err) {
      console.error(err)
      alert("Something went wrong")
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Guest History</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div>
          <label>From: </label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border p-1 rounded" />
        </div>
        <div>
          <label>To: </label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border p-1 rounded" />
        </div>
        <div>
          <label>Quick Filter: </label>
          <select value={filter} onChange={e => setFilter(e.target.value as any)} className="border p-1 rounded">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <button
		  className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
		  disabled={loading}
		  onClick={() => fetchHistory()}
		>
		  Apply
		</button>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading guest history...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Name</th>
                <th className="p-2">Room ID</th>
                <th className="p-2">Check-in</th>
                <th className="p-2">Check-out</th>
                <th className="p-2">Total</th>
                <th className="p-2">Payment</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="p-2">{h.name}</td>
                  <td className="p-2">{h.room_id}</td>
				  <td className="p-2"> {h.checkin_time ? formatDateTimeDisplay(toIST(new Date(h.checkin_time))) : "-"}</td>
				  <td className="p-2"> {h.checkout_time ? formatDateTimeDisplay(toIST(new Date(h.checkout_time))) : "-"}</td>
                  <td className="p-2">₹{h.gross_total?.toFixed(2) || "0.00"}</td>
                  <td className="p-2">{h.payment_method}</td>
                  <td className="p-2">
                    <button
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => handleDelete(h.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex gap-2 mt-4">
        <button
          disabled={page === 1}
          className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
          onClick={() => setPage(prev => Math.max(prev - 1, 1))}
        >
          Prev
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          disabled={page === totalPages}
          className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
          onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
        >
          Next
        </button>
      </div>
    </div>
  )
}
