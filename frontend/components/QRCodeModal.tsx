import React from "react";

interface QRCodeModalProps {
  eventId: string;
  joinCode?: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ eventId, joinCode, onClose }) => {
  const qrUrl = `/api/events/${eventId}/qr${joinCode ? `?joinCode=${joinCode}` : ""}`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">Scan to Join</h3>
        <p className="text-sm text-slate-400 mb-4">Point your camera to join this competition team instantly</p>
        <div className="bg-white p-4 rounded-lg inline-block mb-4">
          <img src={qrUrl} alt="Join QR Code" className="w-48 h-48 mx-auto" />
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
