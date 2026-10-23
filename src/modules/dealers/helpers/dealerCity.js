/*
 * A dealer has one primary city (businessAddress) with the top-level
 * productServices / capacity fields, plus any number of additionalCities,
 * each with its own services and capacity. These helpers give the profile
 * that applies to a given city.
 */

const toPlain = (value) =>
  value && typeof value.toObject === "function" ? value.toObject() : value;

export const getPrimaryCityId = (dealer) => {
  const id =
    dealer?.businessAddress?.cityId ?? dealer?.residentialAddress?.cityId;

  return id === undefined || id === null || id === "" ? null : Number(id);
};

export const getDealerCityProfile = (dealer, cityId) => {
  if (!dealer || cityId === undefined || cityId === null) return null;

  const wanted = Number(cityId);

  if (getPrimaryCityId(dealer) === wanted) {
    return {
      cityId: wanted,
      city: dealer.businessAddress?.city ?? dealer.residentialAddress?.city ?? "",
      productServices: toPlain(dealer.productServices) ?? [],
      combinedCapacity: toPlain(dealer.combinedCapacity) ?? {
        products: [],
        capacity: 0,
      },
      individualCapacities: toPlain(dealer.individualCapacities) ?? [],
      isPrimary: true,
    };
  }

  const extra = (dealer.additionalCities ?? []).find(
    (item) => Number(item.cityId) === wanted,
  );

  if (!extra) return null;

  const plain = toPlain(extra);

  return {
    cityId: wanted,
    city: plain.city ?? "",
    productServices: plain.productServices ?? [],
    combinedCapacity: plain.combinedCapacity ?? { products: [], capacity: 0 },
    individualCapacities: plain.individualCapacities ?? [],
    isPrimary: false,
  };
};

export const dealerOperatesInCity = (dealer, cityId) =>
  Boolean(getDealerCityProfile(dealer, cityId));

// Every city (primary first) with its profile
export const getAllDealerCityProfiles = (dealer) => {
  const primaryId = getPrimaryCityId(dealer);
  const list = [];

  if (primaryId !== null) {
    list.push(getDealerCityProfile(dealer, primaryId));
  }

  for (const extra of dealer?.additionalCities ?? []) {
    if (Number(extra.cityId) === primaryId) continue;

    list.push(getDealerCityProfile(dealer, extra.cityId));
  }

  return list.filter(Boolean);
};
