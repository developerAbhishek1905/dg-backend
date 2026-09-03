import Counter from "../model/counter.model.js";
import District from "../model/district.model.js";

const COUNTER_NAME = "district_id";

const initializeDistrictCounter = async () => {
  let counter = await Counter.findOne({
    name: COUNTER_NAME,
  });

  if (counter) {
    return counter;
  }

  const lastDistrict = await District.findOne()
    .sort({ district_id: -1 })
    .select("district_id");

  const maxDistrictId = lastDistrict?.district_id || 0;

  try {
    counter = await Counter.create({
      name: COUNTER_NAME,
      sequence: maxDistrictId,
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

export const getNextDistrictId = async () => {
  await initializeDistrictCounter();

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

export const syncDistrictCounter = async (districtId) => {
  await initializeDistrictCounter();

  await Counter.findOneAndUpdate(
    {
      name: COUNTER_NAME,
    },
    {
      $max: {
        sequence: Number(districtId),
      },
    }
  );
};