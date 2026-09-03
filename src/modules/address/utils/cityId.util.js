import Counter from "../model/counter.model.js";
import City from "../model/city.model.js";

const COUNTER_NAME = "city_id";

const initializeCityCounter = async () => {
  let counter = await Counter.findOne({
    name: COUNTER_NAME,
  });

  if (counter) {
    return counter;
  }

  const lastCity = await City.findOne().sort({ city_id: -1 }).select("city_id");

  const maxCityId = lastCity?.city_id || 0;

  try {
    counter = await Counter.create({
      name: COUNTER_NAME,
      sequence: maxCityId,
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

export const getNextCityId = async () => {
  await initializeCityCounter();

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
    },
  );

  return counter.sequence;
};

export const syncCityCounter = async (cityId) => {
  await initializeCityCounter();

  await Counter.findOneAndUpdate(
    {
      name: COUNTER_NAME,
    },
    {
      $max: {
        sequence: Number(cityId),
      },
    },
  );
};
