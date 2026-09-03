// utils/pincodeId.util.js

import Counter from "../model/counter.model.js";
import Pincode from "../model/pincode.model.js";

const COUNTER_NAME = "pincode_id";

const initializePincodeCounter = async () => {
  let counter = await Counter.findOne({
    name: COUNTER_NAME,
  });

  if (counter) {
    return counter;
  }

  const lastPincode = await Pincode.findOne()
    .sort({ pincode_id: -1 })
    .select("pincode_id");

  const maxPincodeId = lastPincode?.pincode_id || 0;

  try {
    counter = await Counter.create({
      name: COUNTER_NAME,
      sequence: maxPincodeId,
    });
  } catch (error) {
    if (error.code === 11000) {
      counter = await Counter.findOne({
        name: COUNTER_NAME,
      });
    } else {
      throw error;
    }
  }

  return counter;
};

export const getNextPincodeId = async () => {
  await initializePincodeCounter();

  const counter = await Counter.findOneAndUpdate(
    {
      name: COUNTER_NAME,
    },
    {
      $inc: {
        sequence: 1,
      },
    },
    {
      new: true,
    }
  );

  return counter.sequence;
};

export const syncPincodeCounter = async (pincodeId) => {
  await initializePincodeCounter();

  await Counter.findOneAndUpdate(
    {
      name: COUNTER_NAME,
    },
    {
      $max: {
        sequence: Number(pincodeId),
      },
    }
  );
};