import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { formatDateTimeSQL } from "../../utils/dateUtils";
import { calculateGST } from "../../utils/billingUtils";
import { Building2, BedDouble, Loader2 } from "lucide-react";

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  floor: string;
  base_price: number;
  status: string;
}

const SelectRoomPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomType, floor } = location.state || {};

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const guestState = "KARNATAKA"; // Update as needed based on actual guest information

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_type", roomType)
        .eq("floor", floor)
        .eq("status", "Available");

      if (error) console.error("Error fetching rooms:", error.message);
      setRooms(data || []);
      setLoading(false);
    };

    if (roomType && floor) fetchRooms();
  }, [roomType, floor]);

  const handleContinue = async () => {
    if (selectedRoom) {
      const room = rooms.find((r) => r.id === selectedRoom);
      if (room) {
        const checkinTimeIST = formatDateTimeSQL(new Date());

        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase.from("system_logs").insert([
          {
            action: "CHECKIN_INITIATED",
            details: `User ${user?.email || "Unknown"} selected Room ${room.room_number} (${room.room_type}) on ${room.floor} floor`,
            created_at: checkinTimeIST,
          },
        ]);

        navigate("/guest-info", { state: { room } });
      }
    }
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background:
          "linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 50%, #fef08a 100%)",
      }}
    >
      <div className="max-w-5xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-wrap gap-3 mb-6">
          <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium shadow-sm">
            Room Type: {roomType}
          </span>
          <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium shadow-sm">
            Floor: {floor}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Available Rooms
          <span className="ml-2 text-gray-500 text-lg">({rooms.length} found)</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin w-8 h-8 text-green-600" />
          </div>
        ) : rooms.length === 0 ? (
          <p className="text-center text-gray-600 py-10">
            No available rooms found.
          </p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const gst = calculateGST(guestState, room.base_price);
              const total = room.base_price + gst.cgst + gst.sgst + gst.igst;
              const isSelected = selectedRoom === room.id;

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`relative border rounded-xl p-5 cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.02] ${
                    isSelected
                      ? "border-yellow-400 ring-2 ring-yellow-300 bg-yellow-100"
                      : "bg-green-50 border-green-200 hover:border-green-400 hover:shadow-green-200"
                  }`}
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Room {room.room_number}
                  </h3>
                  <p className="text-sm flex items-center text-gray-600 mb-1">
                    <BedDouble className="w-4 h-4 mr-1 text-green-600" />{" "}
                    {room.room_type}
                  </p>
                  <p className="text-sm flex items-center text-gray-600">
                    <Building2 className="w-4 h-4 mr-1 text-green-600" />{" "}
                    {room.floor} Floor
                  </p>
                  <p className="text-xl font-bold text-gray-800 mt-3">
                    ₹{total.toLocaleString()}/night
                  </p>
                  <p className="text-xs text-gray-500">
                    Base ₹{room.base_price} +{" "}
                    {gst.cgst > 0 && `CGST ₹${gst.cgst.toFixed(2)}`}
                    {gst.sgst > 0 && `, SGST ₹${gst.sgst.toFixed(2)}`}
                    {gst.igst > 0 && `, IGST ₹${gst.igst.toFixed(2)}`}
                  </p>
                  {isSelected && (
                    <div className="absolute top-3 right-3 bg-green-600 text-white text-xs px-3 py-1 rounded-full shadow-md">
                      Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedRoom && (
        <div className="fixed bottom-6 left-0 w-full flex justify-center">
          <button
            onClick={handleContinue}
            className="px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl shadow-lg transition"
          >
            Continue with Room {rooms.find((r) => r.id === selectedRoom)?.room_number}
          </button>
        </div>
      )}
    </div>
  );
};

export default SelectRoomPage;
