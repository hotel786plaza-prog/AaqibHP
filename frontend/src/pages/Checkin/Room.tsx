import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { calculateGST } from "../../utils/billingUtils"; // import from your billing utils

const RoomSelection = () => {
  const navigate = useNavigate();

  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // For demo, assume Karnataka as default guest state here
  const guestState = "KARNATAKA";

  const floors = [
    { name: "Ground", desc: "Easy access" },
    { name: "First", desc: "Good view" },
    { name: "Second", desc: "Best view" },
  ];

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("rooms")
        .select("room_type, base_price");

      if (error) {
        console.error("Error fetching rooms:", error.message);
      } else {
        const grouped: Record<string, { base_price: number }> = {};
        data.forEach((row) => {
          if (!grouped[row.room_type]) {
            grouped[row.room_type] = {
              base_price: row.base_price
            };
          }
        });

        const formatted = Object.keys(grouped).map((roomType) => ({
          name: roomType,
          base_price: grouped[roomType].base_price,
        }));

        const sorted = formatted.sort((a, b) => a.base_price - b.base_price);
        setRooms(sorted);
      }
      setLoading(false);
    };

    fetchRooms();
  }, []);

  const isFloorDisabled = (floor: string) => {
    if (
      (selectedRoom === "Triple Bed" && floor === "Ground") ||
      (selectedRoom === "Ordinary" && floor === "Ground")
    ) {
      return true;
    }
    return false;
  };

  const handleContinue = () => {
    if (selectedRoom && selectedFloor) {
      navigate("/select-room", {
        state: { roomType: selectedRoom, floor: selectedFloor },
      });
    }
  };
  

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-green-300 via-green-400 to-yellow-300 text-green-900 p-8 flex flex-col items-center font-[Poppins]">
      {/* Decorative blurs */}
      <div className="absolute w-96 h-96 bg-green-400 rounded-full blur-3xl opacity-40 -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-yellow-400 rounded-full blur-3xl opacity-40 bottom-0 right-0" />

      {/* Room Type */}
      <div className="w-full max-w-4xl relative z-10 mb-12">
        <h2 className="text-2xl font-bold mb-6">Select Room Type</h2>
        {loading ? (
          <p className="text-green-800">Loading rooms...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {rooms.map((room) => {
              const gst = calculateGST(guestState, room.base_price);
              return (
                <button
                  key={room.name}
                  onClick={() => setSelectedRoom(room.name)}
                  className={`p-5 rounded-xl border backdrop-blur-md bg-white/70 text-center shadow-lg transition-all hover:scale-105 ${
                    selectedRoom === room.name
                      ? "border-yellow-400 shadow-yellow-300/50"
                      : "border-yellow-200 hover:border-yellow-300/50"
                  }`}
                >
                  <div className="font-semibold text-green-900">{room.name}</div>
                  <div className="text-sm text-green-700 mt-1">
  GST {gst.gstPercent ?? 0}%: ₹{(gst.totalGST ?? 0).toFixed(2)}
</div>
<div className="text-xs text-green-700">
  {gst.cgst ? `CGST ₹${gst.cgst.toFixed(2)}` : ""}
  {gst.sgst ? ` / SGST ₹${gst.sgst.toFixed(2)}` : ""}
  {gst.igst ? `IGST ₹${gst.igst.toFixed(2)}` : ""}
</div>
<div className="mt-1 font-semibold text-yellow-800">
  Total: ₹{(gst.finalRoomCharge ?? 0).toFixed(2)}
</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floor Selection */}
      <div className="w-full max-w-4xl relative z-10 mb-12">
        <h2 className="text-2xl font-bold mb-6">Select Floor</h2>
        <div className="grid grid-cols-3 gap-6">
          {floors.map((floor) => {
            const disabled = isFloorDisabled(floor.name);
            return (
              <button
                key={floor.name}
                onClick={() => !disabled && setSelectedFloor(floor.name)}
                disabled={disabled}
                className={`p-5 rounded-xl border backdrop-blur-md bg-white/70 text-center shadow-lg transition-all ${
                  disabled
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:scale-105 hover:border-yellow-300/50"
                } ${
                  selectedFloor === floor.name
                    ? "border-yellow-400 shadow-yellow-300/50"
                    : "border-yellow-200"
                }`}
              >
                <div className="font-semibold text-green-900">{floor.name}</div>
                <div className="text-sm text-green-700 mt-1">{floor.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Continue */}
      <div className="w-full max-w-4xl flex justify-end relative z-10">
        <button
          onClick={handleContinue}
          disabled={!selectedRoom || !selectedFloor}
          className={`px-8 py-3 rounded-lg font-semibold transition-all shadow-lg ${
            selectedRoom && selectedFloor
              ? "bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900"
              : "bg-gray-400/30 text-gray-600 cursor-not-allowed"
          }`}
        >
          Continue →
        </button>
      </div>
    </div>
  );
};

export default RoomSelection;
