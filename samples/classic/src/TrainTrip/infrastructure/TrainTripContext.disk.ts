import TrainTrip, {
  isLocked,
  Price,
  TravelClassConfiguration,
} from "@/TrainTrip/TrainTrip"
import { TrainTripContext as TrainTripContextType } from "@/TrainTrip/usecases/types"
import { DomainEventHandler, Event, configure } from "@fp-app/framework-classic"
import * as diskdb from "@fp-app/io.diskdb"
import TravelClassDefinition from "../TravelClassDefinition"
import { TravelClass } from "../Trip"
import { TrainTripView } from "../usecases/getTrainTrip"
import TrainTripReadContext from "./TrainTripReadContext.disk"
import PaxDefinition, { Pax } from "../PaxDefinition"

// Since we assume that saving a valid object, means restoring a valid object
// we can assume data correctness and can skip normal validation and constructing.
// until proven otherwise.
const DiskDBContext = configure(
  function TrainTripContext({ eventHandler, readContext, trainTrips }) {
    let disposed = false
    const getAndClearEvents = (): Event[] => {
      return trainTrips.intGetAndClearEvents()
    }
    const save = () =>
      trainTrips.intSave(
        (i) => readContext.create(i.id, TrainTripToView(i)),
        (i) => readContext.delete(i.id),
      )
    const dispose = () => (disposed = true)
    return {
      save: () => {
        if (disposed) {
          throw new Error("The context is already disposed")
        }
        return eventHandler.commitAndPostEvents(getAndClearEvents, save)
      },
      trainTrips,
      dispose,
    } as TrainTripContextType
  },
  () => ({
    eventHandler: DomainEventHandler,
    readContext: TrainTripReadContext,
    trainTrips,
  }),
)

export function trainTrips() {
  return new diskdb.EventHandlingDiskRecordContext<TrainTrip>(
    "trainTrip",
    serializeTrainTrip,
    deserializeDbTrainTrip,
  )
}

export default DiskDBContext

const TrainTripToView = (trip: TrainTrip): TrainTripView => {
  const {
    createdAt,
    currentTravelClassConfiguration,
    id,
    pax,
    startDate,
    travelClassConfiguration,
  } = trip
  return {
    id,

    allowUserModification: !isLocked(trip),
    createdAt,

    pax,
    startDate,
    travelClass: currentTravelClassConfiguration.travelClass.name,
    travelClasses: travelClassConfiguration.map(
      ({ travelClass: { name, templateId } }) => ({ templateId, name }),
    ),
  }
}

// Need access to private events here..
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeTrainTrip = ({ events: _, ...rest }: any) => diskdb.stringify(rest)

function deserializeDbTrainTrip(serializedTrainTrip: string) {
  const {
    createdAt,
    currentTravelClassConfiguration,
    id,
    lockedAt,
    pax,
    startDate,
    travelClassConfiguration,
    ...rest
  } = diskdb.parse<TrainTripDTO>(serializedTrainTrip)
  // what do we do? we restore all properties that are just property bags
  // and we recreate proper object graph for properties that have behaviors
  // TODO: use type information or configuration, probably a library ;-)

  const travelClassConfigurations = travelClassConfiguration.map(
    mapTravelClassConfigurationDTO,
  )
  const trainTrip = new TrainTrip(
    id,
    pax as PaxDefinition,
    new Date(startDate),
    travelClassConfigurations,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    travelClassConfigurations.find(
      (x) => x.travelClass.name === currentTravelClassConfiguration.travelClass.name,
    )!,
    new Date(createdAt),
    {
      ...rest,
      lockedAt: lockedAt ? new Date(lockedAt) : undefined,
    },
  )

  return trainTrip
}

const mapTravelClassConfigurationDTO = ({
  travelClass,
  ...slRest
}: TravelClassConfigurationDTO) =>
  ({
    ...slRest,
    travelClass: mapTravelClassDTO(travelClass),
  } as TravelClassConfiguration)

const mapTravelClassDTO = (dto: TravelClassDTO) =>
  ({
    ...dto,
    createdAt: new Date(dto.createdAt),
  } as TravelClass)

interface TrainTripDTO {
  createdAt: string
  currentTravelClassConfiguration: TravelClassConfigurationDTO
  id: string
  startDate: string
  lockedAt?: string
  pax: Pax
  travelClassConfiguration: TravelClassConfigurationDTO[]
}
interface TravelClassConfigurationDTO {
  travelClass: TravelClassDTO
  price: Price
}
interface TravelClassDTO {
  createdAt: string
  name: TravelClassDefinition
  templateId: string
}
