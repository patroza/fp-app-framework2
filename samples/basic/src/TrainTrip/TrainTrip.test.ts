import { changeStartDate } from "./TrainTrip"
import { E } from "@fp-app/fp-ts-extensions"

describe("changeStartDate", () => {
  it("works", () => {
    const tt = { startDate: new Date(2020, 1, 1) }
    const newDate = new Date(2020, 1, 2)
    const r = changeStartDate(tt)(newDate)
    expect(E.isOk(r)).toBe(true)
    const [newTT, events] = r.right
    expect(newTT.startDate).toStrictEqual(newDate)
    expect(events.length).toBe(2)
  })
})
