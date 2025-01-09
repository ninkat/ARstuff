import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function Button(props) {
  // Declare a state variable for the button label
  const [label, setLabel] = useState(props.label); // Initialize state with the initial label

  // Define the handleClick function to alternate the label
  const handleClick = () => {
    // Toggle the label between "Click Me" and "Clicked Me!"
    setLabel((prevLabel) => (prevLabel === "Click Me" ? "Clicked Me!" : "Click Me"));
  };

  return (
    // Attach the handleClick function to the onClick event
    <button onClick={handleClick}>{label}</button>
  );
}

function App() {
  return (
    <div>
      <h1>Click the button:</h1>
      <Button label="Click Me" />
    </div>
  );
}

export default App
