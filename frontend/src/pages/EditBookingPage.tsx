import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";
import {
  formatDateTimeSQL, formatDateTime, 
  differenceInDaysWithTime,
  addDaysWithTime, toIST 
} from "../utils/dateUtils";

export default function EditBookingPage() {

  const location = useLocation();
  const navigate = useNavigate();
  const { booking } = location.state;

const initialCheckoutDate = toIST(new Date(booking.checkout_time));
const initialCheckinDate = toIST(new Date(booking.checkin_time || new Date()));

  const [checkoutDate, setCheckoutDate] = useState(initialCheckoutDate);
  const [stayDays, setStayDays] = useState(booking.stay_days);
  const [guests, setGuests] = useState(booking.guests || []);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomId, setRoomId] = useState(booking.rooms.id);
  const [advancePaid, setAdvancePaid] = useState(booking.advance_payment || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const { data, error } = await supabase.from("rooms").select("*");
    if (!error) {
      const filtered = (data || []).filter(
        (r) => r.status === "Available" || r.id === booking.rooms.id
      );
      setRooms(filtered);
    }
  };

  const onStayDaysChange = (days: number) => {
    if (days < 1) days = 1;
    setStayDays(days);
    const newCheckout = addDaysWithTime(initialCheckinDate, days);
    setCheckoutDate(newCheckout);
  };

  const onCheckoutDateChange = (date: Date) => {
    setCheckoutDate(date);
    const diffDays = differenceInDaysWithTime(date, initialCheckinDate);
    setStayDays(diffDays > 0 ? diffDays : 1);
  };

  // Guest add/edit state for inline form
  const [guestFormData, setGuestFormData] = useState<any>(null);
  const [editingGuestId, setEditingGuestId] = useState<number | null>(null);

  const resetGuestForm = () => {
    setGuestFormData(null);
    setEditingGuestId(null);
  };

  const startEditGuest = (guest: any) => {
    setGuestFormData({ ...guest });
    setEditingGuestId(guest.id);
  };

  const handleGuestFormChange = (field: string, value: any) => {
    setGuestFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const saveGuestForm = () => {
    if (!guestFormData) return;
    if (editingGuestId === null) {
      setGuests([...guests, { ...guestFormData, id: Date.now(), is_primary: false }]);
    } else {
      setGuests(
        guests.map((g) => (g.id === editingGuestId ? guestFormData : g))
      );
    }
    resetGuestForm();
  };

  const removeGuest = (guestId: number) => {
    setGuests(guests.filter((g) => g.id !== guestId));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const oldRoomId = booking.rooms.id;

      // Update booking info
      await supabase
        .from("bookings")
        .update({
          checkout_time: checkoutDate,
          stay_days: stayDays,
          room_id: roomId,
          advance_payment: advancePaid,
        })
        .eq("id", booking.id);

      // Update primary guest room_id only (read-only editing for primary guest)
      const primaryGuest = guests.find((g) => g.is_primary);
      if (primaryGuest) {
        await supabase
          .from("guests")
          .update({ room_id: roomId })
          .eq("id", primaryGuest.id);
      }

      // Remove all non-primary guests in DB to replace with current UI list
      await supabase
        .from("guests")
        .delete()
        .eq("booking_id", booking.id)
        .eq("is_primary", false);

      // Insert all non-primary guests from UI to DB
      const nonPrimaryGuests = guests.filter((g) => !g.is_primary);
      if (nonPrimaryGuests.length > 0) {
        await supabase.from("guests").insert(
          nonPrimaryGuests.map((g) => ({
            booking_id: booking.id,
            room_id: roomId,
            name: g.name,
            age: g.age,
            phone: g.phone,
            gender: g.gender,
            is_primary: false,
          }))
        );
      }

      // Update room statuses if room changed
      if (roomId !== oldRoomId) {
        await supabase.from("rooms").update({ status: "Available" }).eq("id", oldRoomId);
        await supabase.from("rooms").update({ status: "Occupied" }).eq("id", roomId);
      }

      // Log success with details
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const changes = [
        `Stay: ${stayDays} day(s)`,
        `Room: ${oldRoomId} → ${roomId}`,
        `Guest count: ${booking.guests.length} → ${guests.length}`,
      ].join(", ");

      await supabase.from("system_logs").insert([
        {
          action: "Edit-Successful",
          details: changes,
          created_at: formatDateTimeSQL(new Date()),
          user_id: user?.id || null,
          booking_id: booking.id,
        },
      ]);

      toast.success("Booking has been updated!", {
		  style: {
			fontSize: "20px",
			padding: "20px 26px",
		  }
		});

      navigate("/guests");
    } catch (err: any) {
      console.error(err);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("system_logs").insert([
        {
          action: "Edit-Failed",
          details: `Booking #${booking.id} update failed by ${user?.email || "Unknown"}. Error: ${err.message}`,
          created_at: formatDateTimeSQL(new Date()),
          user_id: user?.id || null,
          booking_id: booking.id,
        },
      ]);

            toast.error("Booking update has failed!", {
		  style: {
			fontSize: "20px",
			padding: "20px 26px",
		  }
		});
		
    } finally {
      setLoading(false);
    }
  };

const groupedRooms = rooms.reduce((acc, room) => {
  if (!acc[room.floor]) acc[room.floor] = {};
  if (!acc[room.floor][room.room_type]) acc[room.floor][room.room_type] = [];
  acc[room.floor][room.room_type].push(room);
  return acc;
}, {} as Record<string, Record<string, any[]>>);

// Sort rooms in each floor and type by room_number
Object.values(groupedRooms).forEach((types) => {
  Object.values(types).forEach((roomsArray) => {
    roomsArray.sort((a, b) => {
      // Assuming room_number is a string, do a numeric sort if possible
      const numA = parseInt(a.room_number, 10);
      const numB = parseInt(b.room_number, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      // fallback to string compare
      return a.room_number.localeCompare(b.room_number);
    });
  });
});



  return (
    <div className="w-full min-h-screen p-6 bg-gradient-to-r from-green-300 via-green-400 to-yellow-300 text-green-900 font-normal rounded-xl max-w-5xl mx-auto">
      <h2 className="text-3xl mb-6 font-semibold">✏️ Edit Booking</h2>

      {/* Stay Details */}
      <section className="bg-green-50 rounded-lg shadow border border-yellow-300 mb-6 p-6">
        <h3 className="text-yellow-900 text-xl mb-4 font-semibold">Stay Details</h3>
        <label className="block mb-4">
          <span className="text-yellow-900 font-medium">Checkout Date:</span>
          <input
            type="datetime-local"
             value={formatDateTime(checkoutDate)}
            onChange={(e) => onCheckoutDateChange(new Date(e.target.value))}
            className="w-full border rounded-xl px-3 py-2 mt-1 outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </label>
        <label className="block mb-4">
          <span className="text-yellow-900 font-medium">Total Stay Days:</span>
          <input
            type="number"
            value={stayDays}
            onChange={(e) => onStayDaysChange(Number(e.target.value))}
            min={1}
            className="w-full border rounded-xl px-3 py-2 mt-1 outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </label>
        <label className="block">
          <span className="text-yellow-900 font-medium">Advance Paid (₹):</span>
          <input
            type="number"
            value={advancePaid}
            min={0}
            onChange={(e) => setAdvancePaid(Number(e.target.value))}
            className="w-full border rounded-xl px-3 py-2 mt-1 outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </label>
      </section>

      {/* Change Room */}
      <section className="bg-green-50 rounded-lg shadow border border-yellow-300 mb-6 p-6">
        <h3 className="font-semibold mb-3">Room Assignment</h3>
        <select
				  value={roomId}
				  onChange={(e) => setRoomId(e.target.value)}
				  className="border px-3 py-2 rounded w-full"
				>
				  {Object.entries(groupedRooms).map(([floor, types]) => (
					<optgroup key={floor} label={`Floor ${floor}`}>
					  {Object.entries(types).map(([roomType, rooms]) =>
						rooms.map((room) => (
						  <option key={room.id} value={room.id}>
							{room.room_number} ({roomType})
						  </option>
						))
					  )}
					</optgroup>
				  ))}
				</select>
      </section>

      {/* Primary Guest */}
     {/* Primary Guest */}
		{guests.find((g) => g.is_primary) && (
		  <section className="bg-green-50 rounded-lg shadow border border-yellow-300 p-6 mb-6">
			<h3 className="font-semibold mb-3">Primary Guest Details</h3>
			{(() => {
			  const p = guests.find((g) => g.is_primary);
			  return (
				<div className="p-4 border rounded bg-yellow-50 space-y-1 text-sm">
				  <p className="font-semibold text-lg">{p.name}</p>
				  <p>
					<strong>Gender:</strong> {p.gender}
				  </p>
				  <p>
					<strong>Age:</strong> {p.age}
				  </p>
				  <p>
					<strong>Phone:</strong> {p.phone}
				  </p>
				  
				</div>
			  );
			})()}
		  </section>
		)}


      {/* Guests List (as cards) */}
      <section className="bg-green-50 rounded-lg shadow border border-yellow-300 p-6 mb-6">
        <h3 className="font-semibold mb-3 flex justify-between items-center">
          Guests
          <button
            onClick={() => setGuestFormData({ id: Date.now(), name: "", age: "", phone: "", gender: "Male", is_primary: false })}
            className="bg-yellow-600 hover:bg-yellow-700 text-white rounded px-4 py-1 text-sm"
          >
            + Add Guest
          </button>
        </h3>

        {/* Guest editing form */}
        {guestFormData && (
          <div className="mb-4 p-4 border rounded bg-yellow-50">
            <input
              placeholder="Name"
              value={guestFormData.name}
              onChange={(e) => handleGuestFormChange("name", e.target.value)}
              className="block border rounded w-full p-2 mb-2"
            />
            <input
              placeholder="Age"
              type="number"
              value={guestFormData.age}
              onChange={(e) => handleGuestFormChange("age", e.target.value)}
              className="block border rounded w-full p-2 mb-2"
            />
            <input
              placeholder="Phone"
              value={guestFormData.phone}
              onChange={(e) => handleGuestFormChange("phone", e.target.value)}
              className="block border rounded w-full p-2 mb-2"
            />
            <select
              value={guestFormData.gender}
              onChange={(e) => handleGuestFormChange("gender", e.target.value)}
              className="block border rounded w-full p-2 mb-2"
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
            <div className="flex gap-4">
              <button
                onClick={saveGuestForm}
                className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2"
              >
                Save Guest
              </button>
              <button
                onClick={() => setGuestFormData(null)}
                className="border rounded px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Guests cards */}
        <div className="space-y-4">
          {guests
            .filter((g) => !g.is_primary)
            .map((g) => (
              <div
                key={g.id}
                className="p-4 border rounded bg-yellow-100 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{g.name || "(No Name)"}</p>
                  <p>
                    Age: {g.age || "-"} | Gender: {g.gender} | Phone: {g.phone || "-"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEditGuest(g)}
                    className="text-yellow-700 hover:text-yellow-800 font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeGuest(g.id)}
                    className="text-red-600 hover:text-red-700 font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => navigate(-1)}
          className="border border-yellow-400 rounded px-6 py-2 font-semibold"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="bg-yellow-600 hover:bg-yellow-700 text-white rounded px-6 py-2 font-semibold shadow"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
