const Product=require("../models/productModel");
const User=require("../models/userModel");
const Category=require("../models/categoryModel");
const Address=require("../models/addressModel");
const {use, unsubscribe}=require("../routes/userRoute");
const Wishlist = require("../models/wishlistModel")
const Cart=require("../models/cartModel")


const loadProduct = async (req, res) => {
    try {
        const userData = await User.findById(req.session.user_id);
        const categoryData = await Category.find({ is_blocked: false });
        const categoryIds = categoryData.map(category => category._id);

        // Fetch only products from unblocked categories
        const productData = await Product.find({ category: { $in: categoryIds }, is_listed: true }).limit(100);
        const productSortData = await Product.find({ category: { $in: categoryIds }, is_listed: true }).sort({ _id: -1 }).limit(4);
        let findWish = {};
        if (req.session.user._id) {
          console.log(req.session.user._id);
            const wishlistData = await Wishlist.findOne({ user_id: req.session.user._id});
            console.log(wishlistData,"wishlistdata of anana");
            if (wishlistData) {
                for (let i = 0; i < productData.length; i++) {
                    findWish[productData[i]._id] = wishlistData.products.some(p => p.productId.equals(productData[i]._id));
                }
            }
        }
        res.render("home", { user: userData, product: productData, category: categoryData, productSort: productSortData ,findWish});
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
}


const loadIndivitualProduct=async(req,res)=>{
    try{
        const id=req.query.id;
        const userData=await User.findById(req.session.user_id);
        const productData=await Product.findById({_id:id,is_listed:true});
        const categoryData=await Category.find({is_blocked:false})

        const category = categoryData.find(cat => cat._id.toString() === productData.category.toString());
        let findWish = {};
        if (req.session.user._id) {
          console.log(req.session.user._id);
            const wishlistData = await Wishlist.findOne({ user_id: req.session.user._id});
            console.log(wishlistData,"wishlistdata of anana");
            if (wishlistData) {
                for (let i = 0; i < productData.length; i++) {
                    findWish[productData[i]._id] = wishlistData.products.some(p => p.productId.equals(productData[i]._id));
                }
            }
        }
        if(productData){
            res.render("productDetails",{product:productData,user:userData,category:category.name,findWish})

        }else{
            res.redirect("/home");
        }

    }catch(error){
        console.log(error.message);
        res.status(500).send("internal server error");
    }
}


const loadShop = async (req, res) => {
    try {
        const sortby = req.query.sortby || null;
        const category = req.query.category || null;

        const perPage = 8;
        let page = parseInt(req.query.page) || 1;
        let sortQuery = {};

        // Validate page number to prevent out-of-range errors
        if (page < 1) {
            page = 1;
        }

        // Calculate total number of products
        const totalpdts = await Product.countDocuments({});
        // Calculate total number of pages
        const totalPage = Math.ceil(totalpdts / perPage);

        switch (sortby) {
            case 'name_az':
                sortQuery = { pname: 1 };
                break;
            case 'name_za':
                sortQuery = { pname: -1 };
                break;
            case 'price_low_high':
                sortQuery = { offprice: 1 };
                break;
            case 'price_high_low':
                sortQuery = { offprice: -1 };
                break;
            case 'rating_lowest':
                sortQuery = { rating: 1 };
                break;
            default:
                sortQuery = { all: -1 }; // Setting a default sorting option
                break;
        }

        let productData;

        if (category) {
            // Fetch products based on category, pagination, and sorting
            productData = await Product.find({ category: category })
                .sort(sortQuery)
                .skip(perPage * (page - 1))
                .limit(perPage);
        } else {
            // Fetch products based on pagination and sorting
            productData = await Product.find({})
                .sort(sortQuery)
                .skip(perPage * (page - 1))
                .limit(perPage);
        }

        // Fetch user and category data
        const userData = req.session.user_id ? await User.findById(req.session.user_id) : null;
        const categoryData = await Category.find({});

        // Fetch wishlist data if user is logged in
        let findWish = {};
        if (req.session.user && req.session.user._id) {
            const wishlistData = await Wishlist.findOne({ user_id: req.session.user._id });
            if (wishlistData) {
                for (let i = 0; i < productData.length; i++) {
                    findWish[productData[i]._id] = wishlistData.products.some(p => p.productId.equals(productData[i]._id));
                }
            }
        }

        

      const categories = await Category.find({ is_blocked: false });
        res.render('shop', { user: userData, product: productData, category: categoryData,categories, page, totalPage, sortby, findWish, selectedCategory: req.query.category  });

    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};


const searchProducts = async(req,res)=>{
    try{
        console.log("searching....");
        const { searchDataValue, category } = req.body; // Get search data and selected category from request body
        let query = { pname: { $regex: searchDataValue, $options: 'i' } }; // Initialize search query

        // If a category is selected, add category filter to the query
        if (category) {
            query.category = category;
        }

        const searchProducts = await Product.find(query); // Find products based on search query

        console.log(searchProducts, "searchpdts");
        res.json({ status: "searched", searchProducts });

    } catch(err) {
        console.log(err);
        res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
}

const loadWishList = async(req,res)=>{
    try{
        console.log("hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii");
        
        const wishlistData = await Wishlist.findOne({user_id:req.session.user._id});
        console.log(wishlistData,"wishlistdata");
        if (!wishlistData || wishlistData.products.length === 0) {
            // Wishlist is empty or not found
            return res.render('wishlist', { wishlistData: null, pdtData: null });
        }

        let pdtId=[];
        for(let i=0;i<wishlistData.products.length;i++){
            pdtId.push(wishlistData.products[i].productId)
        }

        let pdtData=[];
        for(let i=0;i<pdtId.length;i++){
            pdtData.push(await Product.findById({_id:pdtId[i]}))
        }

        console.log(pdtData,'pdtdata on ');
        const cartData = [];

        for(let i=0;i<pdtId.length;i++){
            cartData.push(await Cart.findOne({userId:req.session.user._id,"items.productId":pdtId[i]}));
        }
        res.render('wishlist',{wishlistData,pdtData});
    }
    catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
}


const addToWishlist = async(req,res)=>{
    try{
        const id= req.body.id;
        console.log(id,'add wishlist');
        
        const findPdtData = await Product.findById({_id:id});
            const userFind = await Wishlist.findOne({user_id:req.session.user._id});
            
            if(userFind){
                let wishlistPdt = false;
                for(let i=0;i<userFind.products.length;i++){
                    if(findPdtData._id === userFind.products[i].productId){
                        wishlistPdt = true;
                        break;
                    }
                }

                if(wishlistPdt){
                    // res.status(400)
                    res.json({ status: 400 });    
                }
                else{
                    const updateWishlist = await Wishlist.findOneAndUpdate(
                        {user_id:req.session.user._id},
                        {
                            $push:{
                                products:{
                                    productId:findPdtData._id,
                                },
                            },
                        },
                    );
                }

            }
            else{
                const wishlist = new Wishlist({
                    user_id:req.session.user._id,
                    products:[
                        {
                            productId:findPdtData._id,
                        },
                    ],
                });
                 wishlist.save();
                 console.log(wishlist);
            }
            res.json({status:true});

    }
    catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
}



const removeWish=async(req,res)=>{
    try {
        const id=req.body.id
        const findUser=await User.findOne(req.session.user)

        const deletePdt=await Wishlist.findOneAndUpdate(
            {user_id:findUser._id},
            {
                $pull:{products:{productId:id}}
            }

        )

        res.json({status:true})

    } catch (error) {
        console.log(error.message)
    }
}



const removeFromWishlist=async(req,res)=>{
    try {
      
        const id=req.body.id;
        console.log(id);
      

        const delePro=await Wishlist.findOneAndUpdate(
            {user_id:req.session.user._id},
            {
                $pull:{products:{productId:id}}
            }

        )

        res.json({status:true})

    } catch (error) {
        console.log(error.message)
    }
}





module.exports={
    loadProduct,
    loadIndivitualProduct,
    loadShop,
    loadWishList,
    addToWishlist,
    removeFromWishlist,
    removeWish,
    searchProducts,
   

}