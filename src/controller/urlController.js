const urlModel=require("../model/urlModel");
const shortId=require("shortid");
const validator=require("url-validator")
const redis = require("redis");
const { promisify } = require("util");

const isValid=function(value){
     if(typeof value=="undefined"  || value===null) return false;
     if(typeof value==="string" && value.trim().length==0) return false;
    return true;
 }

 //Connect to redis
 const redisClient = redis.createClient( 
   15019,
      "redis-15019.c264.ap-south-1-1.ec2.cloud.redislabs.com",
     { no_ready_check: true }
 );
 redisClient.auth("Dwt3Z55cg4TdDfKFTcUcvdkclEM1y4vM", function (err) {
     if (err) throw err;
 });
 
 redisClient.on("connect", async function () {
     console.log("Connected to Redis..");
 });
 
 
 
 //1. connect to the server a=10
 //2. use the commands :
 
 //Connection setup for redis
 
 const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
 const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

const shortUrl=async function(req,res){
   try{
    let data=req.body

    if(Object.keys(data).length==0) return res.status(400).send({status:false,message:"please Provide key in body"});
      let {longUrl} =data

    if(!isValid(longUrl)) return res.status(400).send({status:false,message:"please Provide url"});
    if(typeof longUrl!="string") return res.status(400).send({status:false,message:"please Provide url in string"});

    if (!validator( longUrl)) return res.status(400).send({status:false,message:"please Provide valid url"});

     let cahcedUrlData = await GET_ASYNC(`${longUrl}`)
     if (cahcedUrlData) {
            return  res.status(201).send({status:true,data:JSON.parse(cahcedUrlData)})
    }else{
    let alreadyUrl= await urlModel.findOne({longUrl:longUrl},{updatedAt:0,createdAt:0,__v:0,_id:0})
    if(alreadyUrl) return  res.status(201).send({status:true, data:alreadyUrl});

     let short=shortId.generate()
     data.shortUrl="http://localhost:3000/"+`${short}`
      data.urlCode=short

   let savedata=await urlModel.create(data) 
   let final= {urlCode:savedata.urlCode,longUrl:savedata.longUrl,shortUrl:savedata.shortUrl} 
   await SET_ASYNC(`${longUrl}`,(JSON.stringify(final)))
   return res.status(201).send({status:true, data:final});
}
  }catch(error){
   return res.status(500).send({status:false,message:error.message});

   }
};

const getUrl = async function (req, res) {
    try {
        let urlCode = req.params.urlCode;
        let cahcedUrlData = await GET_ASYNC(`${req.params.urlCode}`)
        if (cahcedUrlData) {
          return  res.redirect(cahcedUrlData)
        }
        else {
            let urlData = await urlModel.findOne({ urlCode: urlCode })
            if (!urlData) {
              return  res.status(404).send({ status: false, message: "urlCode not found!" });
            }
            await SET_ASYNC(`${req.params.urlCode}`,(urlData.longUrl))


            console.log("Redirecting to the url!!")
            return res.status(302).redirect(urlData.longUrl);


        }
    }
    catch (err) {
         return   res.status(500).send({ status: false, error: err.message })
        }
    

}


module.exports={shortUrl,getUrl} 
