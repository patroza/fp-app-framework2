import { changeStartDate } from "./TrainTrip"
import { E } from "@fp-app/fp-ts-extensions"
import FutureDate from "./FutureDate"

describe("changeStartDate", () => {
  it("works", () => {
    const tt = { id: "some-id", startDate: new Date(2020, 1, 1) }
    const newDate = E.unsafeUnwrap(FutureDate.create(new Date(2050, 1, 2)))
    const r = changeStartDate(tt)(newDate)
    expect(E.isOk(r)).toBe(true)
    const [newTT, events] = E.unsafeUnwrap(r)
    expect(newTT.startDate).toStrictEqual(newDate)
    expect(events.length).toBe(2)
  })
})
