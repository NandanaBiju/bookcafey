const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel")
const Address = require("../models/addressModel");
const generateDate = require("../utils/dateGenerator");
const generateOrder = require("../utils/otphandle")
const Order = require("../models/orderModel")
const Coupon=require("../models/couponModel")
const Wallet=require("../models/walletModel")

require("dotenv").config();
const Razorpay=require("razorpay")
const keyId= process.env.RAZORPAYID
const keySecret = process.env.RAZORPAYSECRET
var instance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  const crypto = require("crypto");




// 
const loadCart = async (req, res) => {
    console.log('loadcart loaded');
    try {
        const id = req.body.id;
        const price = req.body.pdtOffPrice


        const priceOff = parseFloat(price.replace('₹', ''));

        const userData = await User.findOne(req.session.user);
        const pdtData = await Product.findOne({_id:id});

         if (!userData || !pdtData) {
             return res.render('cart', { cartData: null });
         }
        // Find user's cart or create new if not exists
        let userCart = await Cart.findOne({ userId: userData._id });
        if (!userCart) {
            userCart = new Cart({
                userId: userData._id,
                items: [],
                total: 0
            });
        }

        // Check if product already exists in cart
        const existingProductIndex = userCart.items.findIndex(item => item.productId.equals(pdtData._id));

        if (existingProductIndex !== -1) {
            // If product exists, update quantity and subtotal
            userCart.items[existingProductIndex].quantity++;
            userCart.items[existingProductIndex].subTotal += priceOff;
        } else {
            // If product does not exist, add it to cart
            userCart.items.push({
                productId: pdtData._id,
                subTotal: priceOff,
                quantity: 1
            });
        }

        // Update total price of cart
        userCart.total = userCart.items.reduce((total, item) => total + item.subTotal, 0);

        // Save updated cart
        await userCart.save();

        // Return success status
        res.json({ status: true });
    }catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const loadCartpage = async (req, res) => {

    try {

        const userData = await User.findOne(req.session.user);

        let cartData = await Cart.findOne({ userId: userData._id });
        if (!cartData) {
            cartData = new Cart({
                userId: userData._id,
                items: [],
                total: 0
            });
            await cartData.save();
        }

        const array = [];
        for (let i = 0; i < cartData.items.length; i++) {
            array.push(cartData.items[i].productId.toString())
        }
        const pdtData = [];

        for (let i = 0; i < array.length; i++) {
            pdtData.push(await Product.findById({ _id: array[i] }))
        }

        res.render('cart', { pdtData, cartData });


    }
    catch (error) {
        console.log(error.message);
    }
}

const increment = async (req, res) => {
    console.log("addtocart");
    try {

        const { price, pdtId, index, subTotal, qty } = req.body;
        const prices = parseInt(price)
        

        const quantity = parseInt(qty);
        const pdtIdString = pdtId.toString();
        const pdtData = await Product.findById({ _id: pdtIdString });
       
        const stock = pdtData.countInStock;
        
        if (stock > quantity) {
            if (quantity < 5) {

                const filter = { userId: req.session.user._id, 'items.productId': pdtData._id };
                console.log(filter, "filtered");
                const update = { $inc: { "items.$.quantity": 1, "items.$.subTotal": prices, "total": prices } };
                console.log(update, "updated");
                console.log(prices, ",,.....");
                const addPrice = await Cart.findOneAndUpdate(filter, update, { new: true });




                // console.log(addPrice, "addprice");
                const findCart = await Cart.findOne({ userId: req.session.user._id })
                // console.log(findCart, "findded cart");
                // console.log(findCart.total,'.............');
                res.json({ status: true, total: findCart.total })



            }
            else {
                res.json({ status: "minimum" })
            }
        }
        else {
            console.log('out of stock');
            res.json({ status: "stock" });
        }
    }
    catch (error) {
        console.log(error.message);
    }

}







const decrement = async (req, res) => {
    try {
        const { price, pdtId, index, subTotal, qty } = req.body
        console.log(typeof (price, "price...."));
        const pdtIdString = pdtId.toString();
        console.log(pdtIdString, 'string..........');
        const quantity = parseInt(qty)
        console.log(quantity, "qty........");
        const prices = parseInt(price)
        console.log(prices, "pri.................");


        if (quantity > 1) {

            const addPrice = await Cart.findOneAndUpdate({ userId: req.session.user._id, "items.productId": pdtIdString },
                {
                    $inc: { "items.$.quantity": -1, "items.$.subTotal": -prices, "total": -prices }
                })

            const findCart = await Cart.findOne({ userId: req.session.user._id })

            res.json({ status: true, total: findCart.total })
        } else {
            res.json({ status: "minimum" })
        }


    } catch (error) {
        console.log(error.message)
    }
}


const removeCart = async (req, res) => {
    try {
        const id = req.body.id
        const sbt = req.body.sbt
        console.log(id, '.............');
        console.log(sbt, 'sbt........');

        const delePro = await Cart.findOneAndUpdate({ userId: req.session.user._id }, {
            $pull: { items: { productId: id } },
            $inc: { total: -sbt }
        },{new:true})
        
        if (!delePro) {
            return res.status(404).json({ status: false, message: "Cart not found" });
        }

        // Send the updated total in the response
        res.json({ status: true, total: delePro.total });
        res.redirect('/cart');
        // console.log(id)
    } catch (error) {
        console.log(error.message)
    }
}





const addOrder = async (req, res) => {
    try {
        const userData = await User.findOne(req.session.user);
        const walletData = await Wallet.findOne({ userId: userData._id });
        const cartData = await Cart.findOne({ userId: userData._id });

        const { addressId, cartid, checkedOption,paymentOption,totalDis,code, index} = req.body;
        const findCoupon = await Coupon.findOne({couponCode:code})
        if(!addressId || !paymentOption){
            res.json({status:"fill the options"})
        }else if (paymentOption === "Wallet") {
            if (walletData.balance < totalDis) {
                return res.json({ status: "insufficient_balance" });
            }
            const orderNum = generateOrder.generateOrder();
            const date = generateDate();

            // Deduct payment from wallet
            walletData.balance -= totalDis;
            walletData.transactions.push({
                id: orderNum,
                date: date,
                amount: totalDis,
                orderType: "Wallet Payment",
                type: "Debit"
            });
            await walletData.save();
            
            // Proceed with order placement
           
            const addressData = await Address.findOne({ "address._id": addressId });
            let address = addressData.address[index];
          
            const pdtData = [];
    
            for (let i = 0; i < cartData.items.length; i++) {
                pdtData.push(cartData.items[i]);
            }

            // Create order data
            const orderData = new Order({
                userId: userData._id,
                orderNumber: orderNum,
                userEmail: userData.email,
                items: pdtData,
                totalAmount: totalDis,
                orderType: paymentOption,
                orderDate: date,
                status: "Processing",
                shippingAddress: address
            });

            await orderData.save();
            await Cart.findByIdAndDelete({ _id: cartData._id });

            res.json({ status: true, order: orderData });
        } 
        else if(paymentOption == "Cash On Delivery"){
        const userData = await User.findOne(req.session.user);
        const walletData = await Wallet.findOne({ userId: userData._id });

        
        const cartData = await Cart.findOne({ userId: userData._id });
        // Apply coupon logic here
        const pdtData = [];
    
            for (let i = 0; i < cartData.items.length; i++) {
                pdtData.push(cartData.items[i]);
            }
    
            const orderNum = generateOrder.generateOrder();
    
            const addressData = await Address.findOne({ "address._id": addressId });
    
            let address = addressData.address[index]
    
            const date = generateDate()


            for (const item of cartData.items) {
                const product = await Product.findById(item.productId);
                product.countInStock -= item.quantity; 
                await product.save();
                // console.log(product,"saved");
            }

              console.log(findCoupon,"findCoupon in place order");
              if(findCoupon){
                const orderData = new Order({
                    userId: userData._id,
                    orderNumber: orderNum,
                    userEmail: userData.email,
                    items: pdtData,
                    totalAmount:totalDis,
                    orderType: paymentOption,
                    orderDate: date,
                    status: "Processing",
                    shippingAddress: address,
                    coupon : findCoupon.couponCode,
                    discount : findCoupon.discount
                });
        
                //   console.log(s,"shippingg................");
        
                // console.log(orderData, "orderrrrrrrrrrrrrrr ");
        
                await orderData.save();


                const updateCoupon = await Coupon.findByIdAndUpdate({_id:findCoupon._id},
                    {
                        $push:{
                            users : userData._id
                        }
                    })
        
                    res.json({ status: true, order: orderData });
                    await Cart.findByIdAndDelete({ _id: cartData._id });
        
              }else{
                console.log("no coupon in placing order");
                const orderData = new Order({
                    userId: userData._id,
                    orderNumber: orderNum,
                    userEmail: userData.email,
                    items: pdtData,
                    totalAmount:totalDis,
                    orderType: paymentOption,
                    orderDate: date,
                    status: "Processing",
                    shippingAddress: address,
                    
                });
        
                await orderData.save();

                res.json({ status: true, order: orderData });
            await Cart.findByIdAndDelete({ _id: cartData._id });
              }
    
            
    
    
            
    
        }
        else if(paymentOption == "Razorpay"){
            console.log("entered razo place order ");
            const userData = await User.findOne(req.session.user);
            const cartData = await Cart.findOne({ userId: userData._id });
            console.log(userData,"userdata in razorpay");
            console.log(cartData,"cartdata in raxorpay");
            const pdtData = [];
    
            for (let i = 0; i < cartData.items.length; i++) {
                pdtData.push(cartData.items[i]);
            }
    
            const orderNum = generateOrder.generateOrder();
            const stringOrder_id=orderNum.toString()
            const addressData = await Address.findOne({ "address._id": addressId });
            let address = addressData.address[index]
            const date = generateDate()
        
            
            var options = {
                amount: totalDis * 100,
                currency: "INR",
                receipt: stringOrder_id
              };

              let amount = Number(totalDis)
            //   console.log(amount,"amount");
            //   console.log(options,"optuionsss");
              instance.orders.create(options, function(err, razpayOrder) {
                if(!err){
                    console.log(razpayOrder ,"order razooo");
                    res.json({status:"razorpay",order:razpayOrder,orderNumber:orderNum,total:amount,code:code,address:addressId})
                }
                else{                   
                     console.log("error else ");

                    console.error(err);
                }
              });
        }
        



    } catch (error) {
        console.log(error);
    }
};







const loadorderPlaced = async (req, res) => {
    try {
        const id = req.query.id;
       ;

        const orders = await Order.findOne({ orderNumber: id });
        const pdt = [];

        for (let i = 0; i < orders.items.length; i++) {
            pdt.push(orders.items[i].productId)
        }

        const pdtData = [];
        for (let i = 0; i < pdt.length; i++) {
            pdtData.push(await Product.findById({ _id: pdt[i] }))
        }
        res.render('orderPlaced', { orders, pdtData })

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};







module.exports = {
    loadCart,
    loadCartpage,
    increment,
    decrement,
    removeCart,
    addOrder,
    loadorderPlaced


}