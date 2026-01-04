import "./App.css";
import { Message } from "./Message";

function App() {
    const messages = [
        new Message({
            content: "Hello, world!",
            author: {
                id: "1",
                username: "john_doe",
                displayName: "John Doe",
                nameColors: ["#0004ff", "#00bfff"],
            },
        }),
    ];

    return (
        <div className="root">
            {messages.map((msg, index) => {
                const colors = msg.author.nameColors;

                const gradientColors =
                    colors.length > 1
                        ? [...colors, colors[0]].join(", ")
                        : colors[0] ?? "#00aeff";

                const gradient = `linear-gradient(90deg, ${gradientColors})`;

                return (
                    <div className="message-wrapper" key={index}>
                        <div
                            className="title"
                            style={{ backgroundImage: gradient }}
                        >
                            {msg.author.displayName}
                        </div>
                        <div className="message">{msg.content}</div>
                    </div>
                );
            })}
            <input className="message-input" placeholder="say something cool"></input>
        </div>
    );
}

export default App;
