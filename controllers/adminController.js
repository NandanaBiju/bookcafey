const User=require("../models/userModel");
const Product=require("../models/productModel");
const Category=require("../models/categoryModel");
const{body,validationResult}=require("express-validator");
const bcrypt=require("bcryptjs");
const flash=require("connect-flash");
const fs=require("fs");
const path=require("path");
const Coupon = require("../models/couponModel")
const moment= require("moment")
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs")
const Order = require("../models/orderModel")
const Chart = require("chart.js")
const Cropper=require("cropperjs")

//securing entered password by bcrypying it
const securePassword=async(password)=>{
    try{
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash
    }catch(error){
        console.error(error.message)
    }
}

//loading login page
const loadLogin=async(req,res)=>{
    try{
        const messages=req.flash("error");
        res.render("adminlogin",{messages});
    }catch(error){
      return res.redirect("/error4040")
        console.error(error.message);
    }
}

//verifying admin
const verifyAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      req.flash('error', 'Email and password are required');
      return res.redirect('/admin');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      req.flash('error', 'Please enter a valid email address');
      return res.redirect('/admin');
    }

    const userData = await User.findOne({ email: email });

    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.is_admin === 0) {
          req.flash('error', 'You are not an admin');
          return res.redirect('/admin');
        } else {
          req.session.user_id = userData._id;
          return res.redirect('/admin/home');
        }
      } else {
        req.flash('error', 'Email and password are incorrect.');
        return res.redirect('/admin');
      }
    } else {
      req.flash('error', 'Email and password are incorrect.');
      return res.redirect('/admin');
    }

  } catch (error) {
    console.log(error.message);
    return res.redirect("/error4040")
  }
}
//loading admin dashboard
// const loadDashboard=async(req,res)=>{
//     try{
//         const userData=await User.findById({_id:req.session.user_id})
//         res.render("adminhome",{admin:userData})
//     }catch(error){
//         console.log(error.message)
//     }
// }
const loadDashboard = async (req, res) => {
  try {
    const userData = await User.findById({ _id: req.session.user_id })
    console.log("User Data:", userData);
    // console.log(userData, "admindata in admin");
    const yValues = [0, 0, 0, 0, 0, 0, 0]
    const order = await Order.find({
      status: { $nin: ["Order Confirmed", "Processing","Product Dispatched" ,"Canceled", "Shipped", "Returned","Return Process", "Payment Failed"] },
    });
    console.log("Orders:", order);
    // console.log(order,"order in dashboard");
    for (let i = 0; i < order.length; i++) {
      const orderItem = order[i];
      console.log("Processing order:", orderItem._id);
    
      // Check if createdAt property exists and is defined
      if (orderItem.createdAt !== undefined) {
        const date = orderItem.createdAt;
        const value = new Date(date).getDay();
        console.log("Date:", date, "Day Value:", value);
        yValues[value] += orderItem.totalAmount;
      } else {
        console.log("createdAt is undefined for order:", orderItem._id);
        // Decide how to handle this case based on your requirements
        // For example, you can skip processing this order or handle it differently
      }
    }
    console.log("Y Values:", yValues);


    // to find the total products ordered

    const totalProductCount = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalCount: { $sum: "$items.quantity" }
        }
      },
      {
        $group: {
          _id: null,
          totalProductCount: { $sum: "$totalCount" }
        }
      }
    ]);

    const totalCount = totalProductCount.length > 0 ? totalProductCount[0].totalProductCount : 0;
    // console.log("Total Count of Products in Orders:", totalCount);
     

    //////////////////************************** Top Selling Products  ***************************//////////////////

    

    const topSellingProducts = await Order.aggregate([
      { $match: { status: "Delivered" } }, 
      { $unwind: "$items" }, 
      {
        $group: {
          _id: "$items.productId", 
          totalQuantity: { $sum: "$items.quantity" }, 
          
        },
      },
      { $sort: { totalQuantity: -1 } }, 
      { $limit: 10 },
      {
        $lookup: { 
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: { 
          _id: "$productDetails._id",
          pname: "$productDetails.pname",
          totalQuantity: 1,
          images: "$productDetails.images",
          language: "$productDetails.language"
        },
      },
    ]);


        //////////////////************************** Top Selling Categories  ***************************//////////////////


    const topSellingCategories = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $unwind: "$items" }, 
      {
        $lookup: { 
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" }, 
      {
        $group: { 
          _id: "$product.category",
          totalSales: { $sum: "$items.quantity" },
        },
      },
      {
        $lookup: { 
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" }, 
      {
        $project: { 
          name: "$category.name",
          totalSales: 1,
        },
      },
      { $sort: { totalSales: -1 } }, 
      { $limit: 5 }, 
    ]);
    console.log("Top Selling Categories:", topSellingCategories);


        //////////////////************************** Top Selling Brands  ***************************//////////////////


    const topSellingLanguages = await Order.aggregate([
      { $match: { status: "Delivered" } }, 
      { $unwind: "$items" },
      {
        $lookup: { 
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" }, 
      {
        $group: { 
          _id: "$productDetails.language",
          totalSales: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalSales: -1 } }, 
      { $limit: 5 }, 
    ]);

    // console.log(topSellingBrands, "Top Selling Brands");




    for (let i = 0; i < order.length; i++) {
      const date = order[i].createdAt;
      if (date) {
        console.log(date, "date");
        const value = new Date(date).getDay();
        console.log(value, "value get");
        yValues[value] += order[i].totalAmount;
      } else {
        console.log("createdAt is undefined for order:", order[i]._id);
        // Decide how to handle this case based on your requirements
      }
    }
 
    const allData = await Category.find({})

    const sales = []

    for (let i = 0; i < allData.length; i++) {
      sales.push(0)
    }

    console.log(sales,"sales in dash ")

    const allName = allData.map((x) => x.name)
    const allId = allData.map((x) => x._id)



    console.log(allName,"allname");
    let productId = []
    let quantity = []

    for (let i = 0; i < order.length; i++) {
      for (let j = 0; j < order[i].items.length; j++) {
        productId.push(order[i].items[j].productId)
        quantity.push(order[i].items[j].quantity)
      }
    }
    console.log(quantity ,"qty")
    console.log(productId,"pdtid")

    const productData = []
    for (let i = 0; i < productId.length; i++) {
      productData.push(await Product.findById({ _id: productId[i] }))
    }

    //  console.log(productData,"pdtdata in dashboard");

    

      for (let i = 0; i < productData.length; i++) {
        if (productData[i] && productData[i].category) {
          for (let j = 0; j < allId.length; j++) {
            if (allId[j] == productData[i].category.toString()) {
              console.log(quantity[i]);
              sales[j] += quantity[i];
            }
          }
        }
      }
      
    console.log(sales,"sales ");

    console.log("PRODUCT ID" + productId);
    
    let productSales = [];
    
    for (let i = 0; i < productId.length; i++) {
      productSales.push({ salesCount: 1 });
    }
    
    for (let i = 0; i < productId.length; i++) {
      for (let j = i + 1; j < productId.length; j++) {
        if (productId[i].toString() == productId[j].toString()) {
          productSales[i].salesCount += 1;
        }
      }
    }
    
    console.log(productSales ,"product sales");
    
    const month = await Order.aggregate([
      {
        $project: {
          _id: { $dateToString: { format: "%m-%Y", date: "$createdAt" } },
          totalAmount: 1
        }
      },
      {
        $group: {
          _id: "$_id",
          totalEarnings: { $sum: "$totalAmount" }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    
    console.log(month,"monthlyyy");
    
    let months = ["01-2024","02-2024","03-2024","04-2024","05-2024","06-2024","07-2024","08-2024","09-2024","10-2024","11-2024","12-2024"];
    let array = new Array(months.length).fill(0); // Initialize array with zeros
    
    for (let i = 0; i < months.length; i++) {
      for (let j = 0; j < month.length; j++) {
        if (month[j]._id == months[i]) {
          array[i] += month[j].totalEarnings;
        }
      }
    }
    
    console.log(array,"array in month");
    

    const orderData = await Order.find({ status: "Delivered" });
    let sum = 0;
    for (let i = 0; i < orderData.length; i++) {
      sum = sum + orderData[i].totalAmount;
    }
    const product = await Product.find({});
    const category = await Category.find({});
    // const order = await Order.find({
    //   status: { $nin: ["Ordered", "Canceled", "Shipped"] },
    // });
    // Aggregate pipeline to calculate monthly earnings from delivered orders
    if (order.length > 0) {
      const month = await Order.aggregate([
        // Match orders with status "Delivered"
        { $match: { status: "Delivered" } },
        // Convert orderDate string to ISODate
        {
          $addFields: {
            orderDate: {
              $dateFromString: { dateString: "$orderDate", format: "%d-%m-%Y" },
            },
          },
        },
        // Extract year and month from orderDate
        {
          $addFields: {
            year: { $year: "$orderDate" },
            month: { $month: "$orderDate" },
          },
        },
        // Group by year and month, calculate total earnings for each month
        {
          $group: {
            _id: { year: "$year", month: "$month" },
            totalEarnings: { $sum: "$totalAmount" },
          },
        },
        // Sort by year and month
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);


// Aggregate pipeline to calculate daily earnings from delivered orders
const dailyEarnings = await Order.aggregate([
    // Match orders with status "Delivered"
    { $match: { status: "Delivered" } },
    // Convert orderDate string to ISODate
    {
        $addFields: {
            orderDate: {
                $dateFromString: { dateString: "$orderDate", format: "%d-%m-%Y" },
            },
        },
    },
    // Extract year, month, and day from orderDate
    {
        $addFields: {
            year: { $year: "$orderDate" },
            month: { $month: "$orderDate" },
            day: { $dayOfMonth: "$orderDate" },
        },
    },
    // Group by year, month, and day, calculate total earnings for each day
    {
        $group: {
            _id: { year: "$year", month: "$month", day: "$day" },
            totalEarnings: { $sum: "$totalAmount" },
        },
    },
    // Sort by year, month, and day
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
]);

console.log(dailyEarnings, 'dailyEarnings'); // Check the result in console for debugging purposes



      const proLength = product.length;
      const catLength = category.length;
      const orderLength = order.length;
      res.render("adminhome", {
        sum,
        proLength,
        topSellingProducts,
        sales,
        catLength,
        orderLength,
        month,
        yValues,
        dailyEarnings,
        topSellingCategories,
        totalCount,
        topSellingLanguages,
        allName,
        array

      });
      //  console.log("hhhhhhhhhheeeeeeelo"+month)
    } else {
      const proLength = product.length;
      const catLength = category.length;
      const orderLength = order.length;
      const month = null;
      const dailyEarnings = null;
      res.render("adminhome", {
        sum,
        proLength,
        topSellingProducts,
        catLength,
        orderLength,
        month,
        sales,
        yValues,
        dailyEarnings,
        topSellingCategories,
        totalCount,
        topSellingLanguages,
        allName,
        array
      });
    }






    // res.render('adminhome', { topSellingProducts, topSellingCategories, topSellingBrands, sum,sales,allName,array, totalCount, dailyEarnings });







    // res.render('adminhome', { admin: userData });

  }
  catch (error) {
    res.redirect("/error4040");
    console.log(error.message);
  }
}
//loading user information page
const loadUsers = async (req, res) => {
  try {
    // const userData = await User.find({})
    const perPage = 6;
    let page = parseInt(req.query.page) || 1;

    const totalUsers = await User.countDocuments({});
    const totalPage = Math.ceil(totalUsers / perPage);

    if (page < 1) {
      page = 1;
    } else if (page > totalPage) {
      page = totalPage;
    }

    const startSerialNumber = (page - 1) * perPage + 1;

    const userData = await User.find({})
      .sort({ _id: -1 })
      .skip(perPage * (page - 1))
      .limit(perPage);

    //    console.log(userData)
    res.render('users', { userData, page, totalPage, startSerialNumber, perPage })
  } catch (error) {
    console.log(error.message)
    res.redirect('error4040');
    

  }
}

//loading editing page of user
const editUser=async(req,res)=>{
    try{
        const id=req.query.id;
        if(!id){
            req.flash('error', 'User Id is missing');
            return res.redirect('/admin/home');
        }
        const userDetails=await User.findById(id)
        if(!userDetails){
            req.flash('error', 'User not found');
            return res.redirect('/admin/home');
        }
        res.render("editUser",{userDetails,errorMessage:req.flash('error')});
    }catch(error){
        console.log(error.message)
        req.flash('error', 'Internal Server Error');
        res.redirect('/admin/home');
    }
}

//updating information about existing user
const edit_User=async(req,res)=>{
    try{
        const id=req.query.id
        const{name,email,mobile,password,verified,status}=req.body
        const updateUser=await User.findByIdAndUpdate(id,{name,email,mobile,password,is_verified:verified==="1"?true:false,is_blocked:status==="1"?false:true});
        if(!updateUser){
          return res.redirect("/error4040");
        }
        res.redirect("/admin/users");
    }catch(error){
        console.log(error.message)
        res.redirect('error4040');

    }
};

//admin logging out
const adminLogout=async(req,res)=>{
    try{
        req.session.destroy();
        res.redirect("/admin");
    }catch(error){
        console.log(error);
        res.redirect('error4040');

    }
}

//deleting an existing user
const delete_User=async(req,res)=>{
    try{
        const id=req.query.id;
        const deletedUser=await User.findByIdAndDelete(id)
        if(!deletedUser){
           return  res.redirect('error4040');

        }
        res.redirect("/admin/users");
    }catch(error){
        console.log(error.message);
        res.redirect('error4040');

    }
}

//loading productpage
const loadProducts=async(req,res)=>{
    try{
        if(req.session.user_id){
            const perPage = 5;
            let page = parseInt(req.query.page) || 1;
        
            const totalProducts = await Product.countDocuments({});
            const totalPage = Math.ceil(totalProducts / perPage);
        
            if (page < 1) {
              page = 1;
            } else if (page > totalPage) {
              page = totalPage;
            }
        
            const startSerialNumber = (page - 1) * perPage + 1;
        const allProducts=await Product.find({}).sort({ _id: -1 })
        .skip(perPage * (page - 1))
        .limit(perPage);
  ;
        const categories=await Category.find({is_blocked:false})
        res.render("products",{allProducts,categories,totalPage, page, startSerialNumber})
        }
       
    }catch(error){
        console.log(error.message);
    }
}

//loading page for adding products
const addProduct=async(req,res)=>{
    try{
        const categories=await Category.find({is_blocked:false})
        res.render("addProduct",{categories})
    }catch(error){
        console.log(error.message);
    }
}

//adding products 
const add_Product=async(req,res)=>{
    try{
        const images=req.files.map((file)=>file.filename)

        const newProduct = new Product({
            pname:req.body.ProductName,
            price:parseFloat(req.body.ProductPrice),
            offprice:parseFloat(req.body.ProductOffPrice),
            discountPercentage: parseInt(req.body.DiscountPercentage),
            description:req.body.ProductDetails,
            images:images,
            category:req.body.ProductCategory,
            language:req.body.ProductLanguage,
            color:req.body.ProductColor,
            countInStock: parseInt(req.body.ProductStock),
            is_listed:req.body.listed ==="true",
            
        })
        await newProduct.save();
        res.redirect("/admin/products");
    }catch(error){
        console.log(error.message)
        res.redirect('error4040');
    }
}

//loading to edit product page
const editProduct=async(req,res)=>{
    try{
        const id=req.query.id;
        const product=await Product.findById(id);
        const categories=await Category.find({is_blocked:false})
        if(!product){
           return res.redirect('error4040');
        }
        res.render("editProduct",{product,categories})
    }catch(error){
        console.log(error.message)
        res.redirect('error4040');
    }
}

//updating information about existing product
const edit_Product=async(req,res)=>{
    try{
        const productId=req.query.id;
        const existingProduct=await Product.findById(productId);
        if(!existingProduct){
            return res.redirect('error4040');
        }
        let existingImages=existingProduct.images || [] ;
        const newImages=req.files?req.files.map((file)=>file.filename):[];
        const deletedImages = Array.isArray(req.body.deletedImages) ? req.body.deletedImages : [];

        deletedImages.forEach((deletedImage) => {
            // Remove the deleted image from existing images array
            const index = existingImages.indexOf(deletedImage);
            if (index !== -1) {
                existingImages.splice(index, 1);
            }
        });

        
        const updatedImages = existingImages.concat(newImages).slice(0, 4);

       

            const updatedProduct= {
                pname:req.body.ProductName,
                price:parseFloat(req.body.ProductPrice),
                offprice: parseFloat(req.body.ProductOffPrice),
                discountPercentage: parseInt(req.body.DiscountPercentage),
                description:req.body.ProductDetails,
                category:req.body.ProductCategory,
                language:req.body.ProductLanguage,
                color:req.body.ProductColor,
                images:updatedImages,
                countInStock: parseInt(req.body.ProductStock),
                is_listed:req.body.listed === "true"
            }
            await Product.findByIdAndUpdate(productId,updatedProduct);
            res.redirect("/admin/products")
        

        }catch(error){
            console.log(error.message);
            res.redirect('error4040');
        }

    }       


//deleting existing product details
const deleteProduct=async(req,res)=>{
    try{
        const productId = req.params.productId;
        const result=await Product.deleteOne({_id:productId});
        if(result){
            res.redirect("/admin/products");
        }else{
          res.redirect('error4040');
        }
    }catch(error){
        console.log(error.message);
        res.redirect('error4040');
    }
}  

//loading category page
const loadCategory = async (req, res) => {
  try {
      // Pagination parameters
      const perPage = 5; // Number of categories per page
      const page = parseInt(req.query.page) || 1; // Current page, default to 1

      // Query MongoDB to get categories for the current page
      const categories = await Category.find()
          .skip((page - 1) * perPage)
          .limit(perPage);

      // Count total categories for pagination
      const totalCategories = await Category.countDocuments();
      const totalPages = Math.ceil(totalCategories / perPage);

      const messages = req.flash('error');
      const successMessages = req.flash('success');

      res.render("category", { categories, messages, successMessages, page, totalPages }); // Add 'page' here
  } catch (error) {
      console.log(error.message);
  }
}





//creating new categories
const createCategory=async(req,res)=>{
    try{
        const enterCategory=req.body.name;
        const enterDescription=req.body.description;

        if(!enterCategory||!enterDescription){
            req.flash('error', 'Category name and description are required');
            return res.redirect('/admin/category');
        }
        const existCategory = await Category.findOne({ name: { $regex: `^${enterCategory}$`, $options: 'i' } });
        if (existCategory) {
            req.flash('error', 'Category already exists');
            return res.redirect('/admin/category');
        }

        const existingCategoryWithSpaces = await Category.findOne({ name: { $regex: `^${enterCategory.replace(/\s+/g, '')}$`, $options: 'i' } });
        if (existingCategoryWithSpaces) {
            req.flash('error', 'Category with already exists');
            return res.redirect('/admin/category');

        }

        const newCategory = new Category({
            name: enterCategory.trim(),
            description: enterDescription.trim(),
            is_listed:true
        });
        await newCategory.save();
        req.flash('success', 'Category created successfully');
        res.redirect('/admin/category');
        
    }catch(error){
        console.log(error.message);
        req.flash('error', 'Failed to create category. Please try again later.');
        res.redirect('/admin/category');
    }
}

//loading edit category page
const editCategory=async(req,res)=>{
    try{
        const categoryId=req.params.id;
        const category=await Category.findById(categoryId);
        const messages = req.flash('error');
        const successMessages = req.flash('success');
        res.render("editCategory",{category,messages,successMessages})
    }catch(error){
        console.log(error.message);
        res.redirect('error4040');
    }
}

//editing existing category name description and all
const edit_Category=async(req,res)=>{
    try{
        const categoryId=req.params.id;
        const{name,description,status}=req.body;
        if (!categoryId) {
            req.flash("error", "Category ID is required");
            return res.redirect("/admin/category");
        }

        
        if (!name || !name.trim()) {
            req.flash('error', 'Category name cannot be empty.');
            return res.redirect('/admin/category/edit/' + categoryId);
          }
          if (!description || !description.trim()) {
            req.flash('error', 'Category description cannot be empty.');
            return res.redirect('/admin/category/edit/' + categoryId);
          }
          // Check if the new name is the same as the existing name
        
        const updatedCategory=await Category.findByIdAndUpdate(categoryId,{name,description,is_blocked: status === "Unlist" })
        const existingCategory = await Category.findOne({ name: name.trim() });
        if (existingCategory && existingCategory._id.toString() !== categoryId) {
            req.flash('error', 'Category name already exists.');
            return res.redirect('/admin/category/edit/' + categoryId);
        }
        if(!updatedCategory){
            req.flash("error","category not found");
            return res.redirect("/admin/category")
            // return res.status(404).send("Category not found")
        }else{
            req.flash("success","category updated successfuly")
        res.redirect("/admin/category")
        }
    }catch(error){
        console.log(error.message);
        req.flash("error","failed to update category")
        res.redirect("/admin/category")
    }
}

//deleting existing category
const deleteCategory=async(req,res)=>{
    try{
        const id=req.query.id;
        const category=await Category.findById(id);
        if(!category){
            return res.status(404).send("Category not found")
        }
        if(!category.is_blocked){
            return res.status(403).send("cannot delete an listed category")
        }
        category.is_blocked=true;
        await category.save()
        
            res.redirect("/admin/category")
        
    }catch(error){
        console.log(error.message);
        res.redirect('error4040');
    }
};


const loadSales = async (req, res) => {
  try {
    const order = await Order.find({
      status: { $in: ["Delivered"] },

    }).sort({ _id: -1 });
    
    res.render("adminSales", { order });
  } catch (error) {
    console.log(error.message);
  }
};


const dateFilter = async (req, res) => {
  try {
    const date = req.query.value;
    const date2 = req.query.value1;
    
    const parts = date.split("-");
    const parts1 = date2.split("-");

    const day = parseInt(parts[2], 10);
    const day1 = parseInt(parts1[2], 10);

    const month = parseInt(parts[1], 10);
    const month1 = parseInt(parts1[1], 10);

    const rotatedDate = day + "-" + month + "-" + parts[0];
    const rotatedDate1 = day1 + "-" + month1 + "-" + parts1[0];

    const order = await Order.find({
      status: { $in: ["Delivered"] },
      orderDate: {
        $gte: rotatedDate,
        $lte: rotatedDate1
      }
    }).sort({ _id: -1 });

    res.render("adminSales", { order });
  } catch (error) {
    console.log(error.message);
  }
};




const sortDate = async (req, res) => {
  try {
    const sort = req.query.value;
    let orderDateQuery = {};

    const currentDate = new Date();

    const currentDateString = `${currentDate.getDate()}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`
    if (sort === "Day") {

      orderDateQuery = currentDateString;
    } else if (sort === "Week") {
      const firstDayOfWeek = new Date(currentDate);
      firstDayOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); 
      const lastDayOfWeek = new Date(currentDate);
      lastDayOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 6); 
      const firstDayOfWeekString = `${firstDayOfWeek.getDate()}-${firstDayOfWeek.getMonth() + 1}-${firstDayOfWeek.getFullYear()}`;
      const lastDayOfWeekString = `${lastDayOfWeek.getDate()}-${lastDayOfWeek.getMonth() + 1}-${lastDayOfWeek.getFullYear()}`;
      orderDateQuery = {
        $gte: firstDayOfWeekString,
        $lte: lastDayOfWeekString
      };
    } else if (sort === "Month") {
      orderDateQuery = {
        $regex: `-${currentDate.getMonth() + 1}-`
      };
    } else if (sort === "Year") {
      orderDateQuery = {
        $regex: `-${currentDate.getFullYear()}$`
      };
    }

    const order = await Order.find({
      status: { $nin: ["Ordered", "Canceled", "Shipped"] },
      orderDate: orderDateQuery
    }).sort({ _id: -1 });


    res.render("adminSales", { order });
  } catch (error) {
    console.log(error.message);
  }
};



const addCategoryOffer = async (req, res) => {
  console.log(req.body, "<><><>");
  try {
      const percentage = parseInt(req.body.percentage);
      const categoryId = req.body.categoryId;

      // Find the category by ID
      const findCategory = await Category.findOne({ _id: categoryId });
      console.log(findCategory ,"category found on database")

      // Find all products belonging to the category
      const productData = await Product.find({ category: findCategory });
      console.log(productData ,"category found on product collection database")


      // Check if any product within the category has a non-zero productOffer
      const hasProductOffer = productData.some(product => product.productOffer > percentage);
      console.log(hasProductOffer,"gsedgsegssrhsrhdrr")

      if (hasProductOffer) {
          console.log("Products within this category already have product offers. Category offer not added.");
          return res.json({ status: false, message: "Products within this category already have product offers." });
      }

      // Update categoryOffer only if no product within the category has a productOffer
      await Category.updateOne(
          { _id: categoryId },
          { $set: { categoryOffer: percentage } }
      );

      // Update productOffer to zero for all products within the category
      for (const product of productData) {
          product.productOffer = 0;
          product.offprice = product.price-Math.floor(product.price * (percentage / 100)); // Reset salePrice
          await product.save();
      }

      console.log("Category offer added successfully.");
      res.json({ status: true });

  } catch (error) {
      res.redirect("/pageerror");
      // res.status(500).json({ status: false, message: "Internal Server Error" });
  }
}

const removerCategoryOffer = async (req, res) => {
  try {
      const categoryId = req.body.categoryId;

      // Find the category by ID
      const findCategory = await Category.findOne({ _id: categoryId });

      // If category not found, return an error response
      if (!findCategory) {
          return res.status(404).json({ status: false, message: "Category not found." });
      }

      const percentage = findCategory.categoryOffer;

      // Find products within the category
      const productData = await Product.find({ category: findCategory._id });

      // Update sale prices of products if any exist
      if (productData.length > 0) {
          for (const product of productData) {
              product.offprice = product.offprice + Math.floor(product.price * (percentage / 100));
              await product.save();
          }
      }

      // Reset categoryOffer to 0
      findCategory.categoryOffer = 0;
      
      // Set is_listed field (replace 'true' with the appropriate value)
      findCategory.is_listed = true;

      await findCategory.save();

      res.json({ status: true });

  } catch (error) {
      console.error("Error removing category offer:", error);
      res.status(500).json({ status: false, message: "Internal Server Error" });
  }
}

const addProductOffer = async (req, res) => {
  try {
      console.log(req.body, "req body of add");
      const { productId, percentage } = req.body;
      
      const findProduct = await Product.findOne({ _id: productId });
      const findCategory = await Category.findOne({ _id: findProduct.category });

      // Check if categoryOffer is already set for the category
      if (findCategory.categoryOffer > percentage) {
          console.log("This product's category already has a category offer. Product offer not added.");
          return res.json({ status: false, message: "This product's category already has a category offer." });
      }

      // If categoryOffer is not set for the category, apply product offer to the product
      findProduct.offprice= findProduct.offprice - Math.floor(findProduct.price * (percentage / 100));
      findProduct.productOffer = parseInt(percentage);
      await findProduct.save();

      // Set categoryOffer to zero for the category
      findCategory.categoryOffer = 0;
      await findCategory.save();

      res.json({ status: true });

  } catch (error) {
    res.redirect('error4040');
      // res.status(500).json({ status: false, message: "Internal Server Error" });
  }
}



const removeProductOffer = async (req, res) => {
  try {
      // console.log(req.body);
      const {productId} = req.body
      const findProduct = await Product.findOne({_id : productId})
      // console.log(findProduct);
      const percentage = findProduct.productOffer
      findProduct.offprice = findProduct.offprice + Math.floor(findProduct.price * (percentage / 100))
      findProduct.productOffer = 0
      await findProduct.save()
      res.json({status : true})
  } catch (error) {
    res.redirect('error4040');
     
  }
}





  
module.exports={
    loadLogin,
    verifyAdmin,
    securePassword,
    loadDashboard,
    loadUsers,
    editUser,
    edit_User,
    adminLogout,
    delete_User,
    loadProducts,
    addProduct,
    add_Product,
    editProduct,
    edit_Product,
    deleteProduct,
    loadCategory,
    createCategory,
    editCategory,
    edit_Category,
    deleteCategory,
    addCategoryOffer,
    removerCategoryOffer,
    addProductOffer,
    removeProductOffer,


    loadSales,
  dateFilter,
  sortDate



}