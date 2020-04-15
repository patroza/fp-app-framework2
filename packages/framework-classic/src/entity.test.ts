import Entity from "./entity"

describe("equality", () => {
  it("an entity of same type is equal based on it's id", () => {
    class TestEntity extends Entity {}
    const e1 = new TestEntity("id1")
    const e2 = new TestEntity("id2")
    const e3 = new TestEntity("id1")

    expect(e1.equals(e2)).toBe(false)
    expect(e1.equals(e3)).toBe(true)
  })

  it("an entity of another type is not equal", () => {
    class TestEntity extends Entity {}
    class TestEntity2 extends Entity {}

    const e1 = new TestEntity("id1")
    const e2 = new TestEntity2("id1")

    expect(e1.equals(e2)).toBe(false)
  })
})
