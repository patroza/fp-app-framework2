import { buildRouter } from "@fp-app/hosting.koa"
import changeTrainTrip from "./TrainTrip/usecases/changeTrainTrip"
import createTrainTrip from "./TrainTrip/usecases/createTrainTrip"
import deleteTrainTrip from "./TrainTrip/usecases/deleteTrainTrip"
import getTrainTrip from "./TrainTrip/usecases/getTrainTrip"
import lockTrainTrip from "./TrainTrip/usecases/lockTrainTrip"
import { Pax } from "./TrainTrip/PaxDefinition"

const createTrainTripRouter = () =>
  buildRouter((F) => {
    const trainTripIdValidator = F.string().guid().required()
    const routeWithTrainTripId = F.object({
      trainTripId: trainTripIdValidator,
    }).required()

    const paxEntrySchema = F.number().integer().required()

    const paxSchema = F.object<Pax>({
      adults: paxEntrySchema,
      babies: paxEntrySchema,
      children: paxEntrySchema,
      infants: paxEntrySchema,
      teenagers: paxEntrySchema,
    }).required()

    return F.builder()
      .post("/", createTrainTrip, {
        validator: F.createValidator(
          F.object({
            pax: paxSchema.required(),
            startDate: F.date().required(),
            templateId: F.string().required(),
          }).required(),
        ),
      })
      .get("/:trainTripId", getTrainTrip, {
        validator: F.createValidator(routeWithTrainTripId),
      })
      .patch("/:trainTripId", changeTrainTrip, {
        validator: F.createValidator(
          F.object({
            pax: paxSchema,
            startDate: F.date(),
            trainTripId: trainTripIdValidator,
            travelClass: F.string(),
          })
            .or("pax", "travelClass", "startDate")
            .required(),
        ),
      })
      .delete("/:trainTripId", deleteTrainTrip, {
        validator: F.createValidator(routeWithTrainTripId),
      })
      .post("/:trainTripId/lock", lockTrainTrip, {
        validator: F.createValidator(routeWithTrainTripId),
      })
  })

export default createTrainTripRouter
