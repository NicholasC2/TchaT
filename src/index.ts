import { createAccount, deleteAccount, getAccount, getPublicAccount, login, updateAccount } from "./account.service.js"
import Express from "express"
import cors from "cors"

const app = Express();

app.use(cors({
    origin: "*"
}))

app.use(Express.json());

app.get("/guild/:id", (req, res) => {
    
})

app.get("/account/:user", (req, res) => {
    const username = req.params.user;

    const account = getPublicAccount(username);

    if (!account) {
        return res.status(404).json({ error: "User not found" });
    }

    return res.json(account);
})

app.post("/account/:action", (req, res) => {
    switch(req.params.action) {
        case "create": {
            try {
                const {username, password, displayName} = req.body
                res.json(createAccount(username, password, displayName))
            } catch(err) {
                if(err instanceof Error) {
                    res.json({message: err.message})
                }
            }

            break;
        }
        case "login": {
            try {
                const {username, password} = req.body
                res.json(login(username, password))
            } catch(err) {
                if(err instanceof Error) {
                    res.json({message: err.message})
                }
            }

            break;
        }
        case "update": {
            try {
                const {sessionID, displayName, password} = req.body
                res.json(updateAccount(getAccount(sessionID), {displayName, password}))
            } catch(err) {
                if(err instanceof Error) {
                    res.json({message: err.message})
                }
            }

            break;
        }
        case "delete": {
            try {
                const {sessionID} = req.body
                res.json(deleteAccount(getAccount(sessionID)))
            } catch(err) {
                if(err instanceof Error) {
                    res.json({message: err.message})
                }
            }

            break;
        }
    }
});

app.listen(4000, function() {
    console.log("Server Listening on port 4000")
})