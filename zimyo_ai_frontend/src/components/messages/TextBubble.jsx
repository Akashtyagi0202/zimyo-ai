export default function TextBubble({ msg }) {
  return (
    <div className="text-sm text-gray-800 leading-relaxed">
      {msg.message || ''}
    </div>
  )
}
