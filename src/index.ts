import { createAccount } from "./account.js"
import Express from "express"
import cors from "cors"

const app = Express();

app.use(cors({
    origin: "*"
}))
app.use(Express.json());
app.use(Express.static("public/"));

app.post("/account/:action", (req, res) => {
    switch(req.params.action) {
        case "create": {
            res.json(req.body)
            
            break;
        }
    }
});

app.listen(4000, function() {
    console.log("Server Listening on port 4000")
})