export default function TradeTable({ trades }) {
  return (
    <table className="w-full text-sm border">
      <thead className="bg-gray-200">
        <tr>
          <th>Time</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        {trades.map(t => (
          <tr key={t._id}>
            <td>{new Date(t.time).toLocaleTimeString()}</td>
            <td>{t.price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
