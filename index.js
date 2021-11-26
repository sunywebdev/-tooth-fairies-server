const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

var admin = require("firebase-admin");

var serviceAccount = "./tooth-fairies-firebase-adminsdk.json";

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

//To select ID from MongoDB
const ObjectId = require("mongodb").ObjectId;

const app = express();
const port = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

//MongoDB linking
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@tooth-fairies.ebyj2.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

//Verify with user token
async function verifyToken(req, res, next) {
	if (req.headers?.authorization?.startsWith("Bearer ")) {
		const token = req.headers.authorization.split(" ")[1];
		try {
			const decodedUser = await admin.auth().verifyIdToken(token);
			req.decodedEmail = decodedUser?.email;
		} catch {}
	}
	next();
}

async function run() {
	try {
		await client.connect();

		//DB Folder and Subfolder
		const database = client.db("tooth-fairies");
		const appoinmentsCollection = database.collection("appoinments");
		const usersCollection = database.collection("users");
		const appoinmentPackageCollection =
			database.collection("appoinmentPackages");
		const servicesCollection = database.collection("services");
		const doctorsCollection = database.collection("doctors");
		/* -------- post new data ------------- */

		//To add new user when login or signup
		app.post("/users", async (req, res) => {
			const newuser = req.body;
			console.log("Request from UI ", newuser);
			const result = await usersCollection.insertOne(newuser);
			console.log("Successfully Added New User ", result);
			res.json(result);
		});

		//To update or replace users data when login or signup
		app.put("/users", async (req, res) => {
			console.log(req.body);
			const user = req.body;
			const filter = { email: user?.email };
			console.log("Request to replace or add user", user);
			const options = { upsert: true };
			const updateuser = {
				$set: {
					email: user?.email,
					displayName: user?.displayName,
					photoURL: user?.photoURL,
				},
			};
			const result = await usersCollection.updateOne(
				filter,
				updateuser,
				options,
			);
			res.json(result);
			console.log("Successfully replaced or added user", result);
		});

		//To update or replace users role
		app.put("/users/pageRole", verifyToken, async (req, res) => {
			const user = req.body;
			console.log("Decoded email", req.decodedEmail);
			const requester = req.decodedEmail;
			if (requester) {
				const requesterAccount = await usersCollection.findOne({
					email: requester,
				});
				if (requesterAccount.userRole === "Admin") {
					const filter = { email: user?.email };
					console.log("Request to replace or add Role", user);
					const options = { upsert: true };
					const updateuser = {
						$set: {
							userRole: user?.userRole,
						},
					};
					const result = await usersCollection.updateOne(
						filter,
						updateuser,
						options,
					);
					res.json(result);
					console.log("Successfully replaced or added user", result);
				} else {
					res
						.status(403)
						.json({ message: "You don't have access to make new Admin" });
				}
			}
		});

		//To update or replace users data
		app.put("/users/updateUsers", async (req, res) => {
			console.log(req.body);
			const user = req.body;
			const filter = { email: user?.email };
			console.log("Request to replace or add user", user);
			const options = { upsert: true };
			const updateuser = {
				$set: {
					gender: user?.gender,
					age: user?.age,
					weight: user?.weight,
					contact: user?.contact,
					address: user?.address,
				},
			};
			const result = await usersCollection.updateOne(
				filter,
				updateuser,
				options,
			);
			res.json(result);
			console.log("Successfully replaced or added user", result);
		});

		//To post new appoinment package
		app.post("/appoinmentPackages", async (req, res) => {
			const newAppoinmentPackage = req.body;
			console.log("Request from UI ", newAppoinmentPackage);
			const result = await appoinmentPackageCollection.insertOne(
				newAppoinmentPackage,
			);
			console.log("Successfully Added New appoinment package ", result);
			res.json(result);
		});

		//To post new service
		app.post("/services", async (req, res) => {
			const newService = req.body;
			console.log("Request from UI ", newService);
			const result = await servicesCollection.insertOne(newService);
			console.log("Successfully Added New service ", result);
			res.json(result);
		});

		//To post new appoinments
		app.post("/appoinments", async (req, res) => {
			const newAppoinments = req.body;
			console.log("Request from UI ", newAppoinments);
			const result = await appoinmentsCollection.insertOne(newAppoinments);
			console.log("Successfully Added New Appoinments ", result);
			res.json(result);
		});

		//To change appoinments status
		app.put("/appoinments/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Id :-  ", id);
			const appointmentId = { _id: ObjectId(id) };
			const updatedReq = req.body;
			console.log("Request to change appoinments status ", updatedReq);
			const options = { upsert: true };
			const updatedStatus = {
				$set: {
					visitStatus: updatedReq?.visitStatus,
				},
			};
			const result = await appoinmentsCollection.updateOne(
				appointmentId,
				updatedStatus,
				options,
			);
			res.json(result);
			console.log("Successfully  changed appoinments status", result);
		});

		/* -------- show all data ------------- */
		//To load single user data by email for role
		app.get("/users/:email", async (req, res) => {
			const email = req.params.email;
			console.log("from UI", email);
			const filter = { email: email };
			console.log("Request to find ", filter);
			const user = await usersCollection.findOne(filter);
			let isAdmin = false;
			if (user?.userRole === "Admin") {
				isAdmin = true;
			}
			res.json({ admin: isAdmin });
			console.log("Found one", user);
		});

		//To load single user data by email
		app.get("/singleUsers", async (req, res) => {
			const user = req.query;
			const filter = { email: user?.email };
			console.log("from UI", filter);
			console.log("Request to find ", filter);
			const result = await usersCollection.findOne(filter);
			res.send(result);
			console.log("Found one", result);
		});

		//To Show all users from DB
		app.get("/users", async (req, res) => {
			console.log(req.query);
			const get = usersCollection.find({});
			console.log("Request to find users");
			users = await get.toArray();
			res.send(users);
			console.log("Found all users", users);
		});

		//To show all appoinments by date and email
		app.get("/appoinments", async (req, res) => {
			console.log(req.query);
			const email = req.query.email;
			const date = req.query.date;
			const query = { date: date, email: email };
			const result = appoinmentsCollection.find(query);
			console.log("Request to find Appoinments", query);
			const appoinments = await result.toArray();
			res.json(appoinments);
			console.log("Successfully Found Appoinments", appoinments);
		});
		//To show all appoinments by date
		app.get("/allAppoinments", async (req, res) => {
			console.log(req.query);
			const date = req.query.date;
			const query = { date: date };
			const result = appoinmentsCollection.find(query);
			console.log("Request to find Appoinments", query);
			const appoinments = await result.toArray();
			res.json(appoinments);
			console.log("Successfully Found Appoinments", appoinments);
		});
		//To show total appoinments by date
		app.get("/totalAppoinments", async (req, res) => {
			console.log(req.query);
			const result = appoinmentsCollection.find({});
			console.log("Request to find Appoinments", result);
			const appoinments = await result.toArray();
			res.json(appoinments);
			console.log("Successfully Found Appoinments", appoinments);
		});
	} finally {
		//await client.close();
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("Doctors Portal Server is running just fine");
});

app.listen(port, () => {
	console.log("Doctors Portal Server running on port :", port);
});
