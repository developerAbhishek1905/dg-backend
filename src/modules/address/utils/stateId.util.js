import Counter from "../model/counter.model.js";
import State from "../model/state.model.js";

const COUNTER_NAME = "state_id";

/**
 * Initialize counter using existing State data.
 */
const initializeStateCounter = async () => {
  let counter = await Counter.findOne({
    name: COUNTER_NAME,
  });

  if (counter) {
    return counter;
  }

  const lastState = await State.findOne()
    .sort({ state_id: -1 })
    .select("state_id");

  const maxStateId = lastState?.state_id || 0;

  try {
    counter = await Counter.create({
      name: COUNTER_NAME,
      sequence: maxStateId,
    });
  } catch (error) {
    // Another request might have created the counter
    // simultaneously.
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

/**
 * Generate next sequential state_id.
 */
export const getNextStateId = async () => {
  await initializeStateCounter();

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

/**
 * If user manually provides state_id,
 * make sure counter never goes below it.
 *
 * Example:
 *
 * current sequence = 10
 * manually inserted state_id = 50
 *
 * next auto generated ID = 51
 */
export const syncStateCounter = async (stateId) => {
  await initializeStateCounter();

  await Counter.findOneAndUpdate(
    {
      name: COUNTER_NAME,
    },
    {
      $max: {
        sequence: Number(stateId),
      },
    }
  );
};