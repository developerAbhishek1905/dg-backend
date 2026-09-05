// import Counter from "../../../shared/models/counter.model.js";
import Counter from "../../address/model/counter.model.js"
import Product from "../models/product.model.js";

export const getNextProductId = async () => {
  const counter = await Counter.findOneAndUpdate(
    {
      name: "product_id",
    },
    {
      $inc: {
        sequence: 1,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  return counter.sequence;
};

export const syncProductCounter = async (productId) => {
  await Counter.findOneAndUpdate(
    {
      name: "product_id",
      sequence: {
        $lt: productId,
      },
    },
    {
      $set: {
        sequence: productId,
      },
    },
    {
      upsert: true,
    }
  );
};

export const initializeProductCounter = async () => {
  const latestProduct = await Product.findOne()
    .sort({
      product_id: -1,
    })
    .select("product_id")
    .lean();

  const maxId = latestProduct?.product_id || 0;

  await Counter.findOneAndUpdate(
    {
      name: "product_id",
    },
    {
      $max: {
        sequence: maxId,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
};