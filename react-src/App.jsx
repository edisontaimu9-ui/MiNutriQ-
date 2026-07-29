import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      padding: '12px',
      border: '2px dashed #4CAF50',
      borderRadius: '8px',
      fontFamily: 'sans-serif'
    }}>
      <strong>React pipeline is live ✅</strong>
      <p>Button clicks: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Click me</button>
    </div>
  );
}
