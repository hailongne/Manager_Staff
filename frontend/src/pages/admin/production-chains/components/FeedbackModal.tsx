import { useState } from "react";
import type { ProductionChain, ProductionChainFeedback } from "../../../../api/productionChains";

interface FeedbackModalProps {
  isOpen: boolean;
  chain: ProductionChain | null;
  feedbacks: ProductionChainFeedback[];
  onClose: () => void;
  onSendMessage: (message: string) => void;
  isAdmin: boolean;
}

export function FeedbackModal({ isOpen, chain, feedbacks, onClose, onSendMessage, isAdmin }: FeedbackModalProps) {
  const [newMessage, setNewMessage] = useState("");

  if (!isOpen || !chain) return null;

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Phản hồi - {chain.name}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
        </div>
        <div className="p-6 flex flex-col h-[calc(90vh-120px)]">
          {/* Feedback Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {feedbacks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Chưa có phản hồi nào
              </div>
            ) : (
              feedbacks.map((feedback) => (
                <div
                  key={feedback.feedback_id}
                  className={`flex ${feedback.sender_role === 'leader' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      feedback.sender_role === 'leader'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-green-100 text-green-900'
                    }`}
                  >
                    <div className="text-xs font-medium mb-1">
                      {feedback.sender_role === 'leader' ? '👤' : '👨‍💼'} {feedback.sender?.name} ({feedback.sender_role === 'leader' ? 'Trưởng nhóm' : 'Admin'})
                    </div>
                    <div className="text-sm">{feedback.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(feedback.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Send Message */}
          <div className="border-t pt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isAdmin ? "Trả lời phản hồi..." : "Nhập phản hồi của bạn..."}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}