import { buildRouter } from "@fp-app/hosting.koa"
import changeTrainTrip from "./TrainTrip/usecases/changeTrainTrip"
import createTrainTrip from "./TrainTrip/usecases/createTrainTrip"
import deleteTrainTrip from "./TrainTrip/usecases/deleteTrainTrip"
import getTrainTrip from "./TrainTrip/usecases/getTrainTrip"
import lockTrainTrip from "./TrainTrip/usecases/lockTrainTrip"
import { Pax } from "./TrainTrip/PaxDefinition"

const createTrainTripRouter = () =>
  buildRouter(({ builder, createValidator, v }) => {
    const trainTripIdValidator = v.string().guid().required()
    const routeWithTrainTripId = v
      .object({ trainTripId: trainTripIdValidator })
      .required()

    const paxEntrySchema = v.number().integer().required()

    const paxSchema = v
      .object<Pax>({
        adults: paxEntrySchema,
        babies: paxEntrySchema,
        children: paxEntrySchema,
        infants: paxEntrySchema,
        teenagers: paxEntrySchema,
      })
      .required()

    return builder()
      .post("/", createTrainTrip, {
        validator: createValidator(
          v
            .object({
              pax: paxSchema.required(),
              startDate: v.date().required(),
              templateId: v.string().required(),
            })
            .required(),
        ),
      })
      .get("/:trainTripId", getTrainTrip, {
        validator: createValidator(routeWithTrainTripId),
      })
      .patch("/:trainTripId", changeTrainTrip, {
        validator: createValidator(
          v
            .object({
              pax: paxSchema,
              startDate: v.date(),
              trainTripId: trainTripIdValidator,
              travelClass: v.string(),
            })
            .or("pax", "travelClass", "startDate")
            .required(),
        ),
      })
      .delete("/:trainTripId", deleteTrainTrip, {
        validator: createValidator(routeWithTrainTripId),
      })
      .post("/:trainTripId/lock", lockTrainTrip, {
        validator: createValidator(routeWithTrainTripId),
      })
  })

export default createTrainTripRouter
