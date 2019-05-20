const exec = require('child_process').exec;
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const ShoppingCart = require("../src/ShoppingCart");
const ShoppingCartItem = require("../src/ShoppingCartItem");

// const dbUrl = "mongodb://cartDB:27017/cartdb";
const dbUrl = "mongodb://10.0.0.166:27017/cartdb";
const userUrl = "http://localhost:3000";
const productUrl = "http://localhost:3001";
// const shoppingCartCollectionName="shoppingCart";

const numPopulateItems = 1000;
const numTenants = 5;
const tenantBaseString = "tenant";

let hostname = "unknown_host";
let mongodbConn=null;


setHostname();
//wait one second until mongoDB has started properly, before retrieving DB connection
setTimeout(prepareDatabase,1000);

function getDatabaseConnection(callback) {
    if (mongodbConn == null) {
        MongoClient.connect(dbUrl, function (err, connection) {
            assert.equal(null, err);
            mongodbConn = connection;
            console.log("Retrieved new MongoDB Connection");
            callback(mongodbConn);
        });
    } else {
        callback(mongodbConn);
    }
}

function getDatabaseCollection(collectionName, callback){
    getDatabaseConnection(function(conn){
        var collection = conn.collection(collectionName);
        callback(collection);
    })
}

function prepareDatabase() {
    getDatabaseConnection(function(connection) {
            connection.dropDatabase();
            console.log("Dropped DB");
            mongodbConn = connection;
            populateDB();
        }
    );
}

function randomNumber(min,max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

function compareNumber(a,b){
    return a-b;
}

function setHostname(){
    exec('hostname', function (error, stdOut) {
        hostname = stdOut.trim();
        console.log("Hostname set to: "+hostname);
    });
}
function getHostname(){
    return hostname;
}

function populateDB() {
    let cartCollection;
    let nextCartUserId=0;
    let nextTenantId=0;

//--------insert Shopping Carts--------
    getDatabaseCollection(tenantBaseString+nextTenantId, function (collection) {
        cartCollection = collection;
        insertNextShoppingCart()
    });

    function insertNextShoppingCart(){
        if(nextCartUserId < numPopulateItems){
            let randomProduct = Math.floor((Math.random() * numPopulateItems-1)).toString();
            let randomQty = Math.floor((Math.random() * 10));
            let cartItem = new ShoppingCartItem(randomProduct,randomQty);
            let cart = new ShoppingCart(nextCartUserId.toString(),[cartItem]);
            cartCollection.insertOne({
                shoppingCart: cart
            }, function (err, res) {
                nextCartUserId++;
                insertNextShoppingCart();
            });
        }else {
            if(nextTenantId<numTenants-1) {
                console.log("Carts inserted for " + tenantBaseString + nextTenantId);
                nextCartUserId = 0;
                nextTenantId++;
                getDatabaseCollection(tenantBaseString + nextTenantId, function (collection) {
                        cartCollection = collection;
                        insertNextShoppingCart();
                    }
                );
            }
            else{
                console.log("Carts inserted for " + tenantBaseString + nextTenantId);
                console.log("Finished Cart insert");
            }
        }
    }
}


module.exports = {
    getDatabaseConnection: getDatabaseConnection,
    getDatabaseCollection: getDatabaseCollection,
    prepareDatabase: prepareDatabase,
    setHostname: setHostname,
    getHostname: getHostname,
    userUrl: userUrl,
    productUrl: productUrl,
    numPopulateItems: numPopulateItems,
    numTenants: numTenants,
    tenantBaseString: tenantBaseString
};
