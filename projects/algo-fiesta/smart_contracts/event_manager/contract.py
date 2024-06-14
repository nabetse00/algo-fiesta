from algopy import (
    ARC4Contract,
    arc4,
    Asset,
    String,
    UInt64,
    Account,
    Global,
    GlobalState,
    subroutine,
    urange,
    Bytes,
    op,
    log,
    gtxn,
    Txn,
    itxn,
    OpUpFeeSource,
    ensure_budget,
)
from typing import Literal as L
from typing import TypeAlias

#############
# Constants #
#############
MIN_DURATION = 24 * 3600  # one day in hours
MIN_AHEAD_TIME = 12 * 3600  # 12h in seconds
# State
INIT = 0
STARTED = 1
ON_GOING = 2
ENDED = 3
CANCELED = 4
# Errors
ONLY_EVENT_OWNER = "Only owner"
WRONG_STATUS_NOT_INIT = "Status must be INIT"
WRONG_STATUS = "Wrong Status"
ZERO_ADDRESS_ERROR = "Zero Address not allowed"
WRONG_BEGIN_TIMESTAMP = (
    f"Wrong begin timestamp should be at least {MIN_AHEAD_TIME}s in the future"
)
WRONG_END_TIMESTAMP = (
    f"Wrong end timestamp should be at least {MIN_DURATION}s after begin timestamp"
)
BOX_CREATION_ERROR = "Failed to create box, already exist"
BOX_GET_ERROR = "Failed to get box, doesn't exist"

WRONG_PAYMENT_RECEIVER = "Wrong receiver in payment txn"
WRONG_PAYMENT_AMOUNT = "Wrong amount payment"
WRONG_RE_KEY_TO = "Wrong re key to, should be zero address"
WRONG_GROUP_SIZE = "Wrong group size"
OVER_SUPPLY = "Cannot buy that amount of tickets: over supply"
OVER_MAX_PER_USER = "Cannot buy that amount of tickets: over max per user"
SEAT_TAKEN = "Unavailable seat"
EVENT_ENDED = "Event Ended"
EVENT_NOT_ENDED = "Event not Ended"
USER_DOESNT_EXIST = "User doesn't exist"
NOT_ASSET_OWNER = "Not asset owner"
ASSET_PAYMENT_TOO_LOW = "Asset payment too low"
WROMG_ASSET_RECEIVER = "Wrong asset receiver"
WRONG_ASSET_ID = "Wrong Asset id"

# Logs
APP_CREATED = "[EVENT MANAGER] Created"
APP_STARTED = "[EVENT MANAGER] Started"
APP_STATUS_UPDATE = "[EVENT MANGER] Status Updated from"
# Box prefixes
TICKET_TYPES_BOX_PREFIX = b"tt-"
OWNER_BOX_PREFIX = b"ot-"
SEATS_BOX_PREFIX = b"sb-"
ASSETS_BOX_PREFIX = b"ab-"

Bytes32: TypeAlias = arc4.StaticArray[arc4.Byte, L[32]]
SeatsArray: TypeAlias = arc4.DynamicArray[Bytes32]
AssetsArray: TypeAlias = arc4.DynamicArray[arc4.UInt64]
BoughtTicketsArray: TypeAlias = arc4.DynamicArray[arc4.UInt64]


class TicketsType(arc4.Struct, kw_only=True):
    url: arc4.String
    metadata_hash: Bytes32
    price: arc4.UInt64
    supply: arc4.UInt64
    max_per_user: arc4.UInt64
    sold_amount: arc4.UInt64


class OwnerBox(arc4.Struct, kw_only=True):
    # seats bought by this user
    seats: SeatsArray
    # assets id  bought by this user
    assets: AssetsArray
    # maps a ticket type to number of tickets bought by this user
    bought_tickets: BoughtTicketsArray


class EventManager(ARC4Contract):
    def __init__(self) -> None:
        self.name = String()
        self.event_begin = GlobalState(UInt64(0), description="Event begin timestamp")
        self.event_end = GlobalState(UInt64(0), description="Event end timestamp")
        self.event_owner = GlobalState(Global.zero_address, description="Event owner")
        self.usdc_asset = Asset()
        self.event_status = UInt64(INIT)
        self.last_type_index = UInt64(0)
        log(APP_CREATED)

    @arc4.abimethod
    def start_event(
        self,
        name: String,
        owner: Account,
        usdc_asset: Asset,
        begin_ts: UInt64,
        end_ts: UInt64,
        tt_urls: arc4.DynamicArray[arc4.String],
        tt_hash: arc4.DynamicArray[arc4.StaticArray[arc4.Byte, L[32]]],
        tt_prices: arc4.DynamicArray[arc4.UInt64],
        tt_supply: arc4.DynamicArray[arc4.UInt64],
        tt_max_per_user: arc4.DynamicArray[arc4.UInt64],
        tt_sold_amount: arc4.DynamicArray[arc4.UInt64],
        pay_mbr: gtxn.PaymentTransaction,
    ) -> None:
        security_checks(UInt64(2))
        app_addr = Global.current_application_address
        assert pay_mbr.receiver == app_addr, WRONG_PAYMENT_RECEIVER
        assert pay_mbr.rekey_to == Global.zero_address, WRONG_RE_KEY_TO
        pre_mbr = app_addr.min_balance
        assert self.event_status == UInt64(INIT), WRONG_STATUS_NOT_INIT
        assert owner != Global.zero_address, ZERO_ADDRESS_ERROR
        self.event_owner.value = owner
        # opt_in to usdc_asset
        itxn.AssetTransfer(
            xfer_asset=usdc_asset,
            asset_amount=0,
            asset_receiver=app_addr,
            sender=app_addr,
            fee=0
        ).submit()
        self.usdc_asset = usdc_asset
        current_ts = Global.latest_timestamp
        assert begin_ts > (current_ts + MIN_AHEAD_TIME), WRONG_BEGIN_TIMESTAMP
        assert end_ts > (begin_ts + MIN_DURATION), WRONG_END_TIMESTAMP
        self.event_begin.value = begin_ts
        self.event_end.value = end_ts
        for i in urange(tt_urls.length):
            tt = TicketsType(
                url=tt_urls[i],
                metadata_hash=tt_hash[i].copy(),
                price=tt_prices[i],
                supply=tt_supply[i],
                max_per_user=tt_max_per_user[i],
                sold_amount=tt_sold_amount[i],
            )
            self.create_ticket_type_box(i, tt)
        self.name = name
        self.last_type_index += tt_urls.length
        self.update_to(UInt64(STARTED))
        post_mbr = Global.current_application_address.min_balance
        pay_amount = post_mbr - pre_mbr
        assert pay_mbr.amount == pay_amount, WRONG_PAYMENT_AMOUNT
        log(APP_STARTED)

    @arc4.abimethod
    def buy_ticket(
        self,
        owner: Account,
        number_tickets: UInt64,
        ticket_type_index: UInt64,
        seats: SeatsArray,
        pay_mbr: gtxn.PaymentTransaction,
        pay_asset: gtxn.AssetTransferTransaction,
    ) -> None:
        # checks
        security_checks(UInt64(3))
        self.check_status_not_ended()
        app_addr = Global.current_application_address
        assert pay_mbr.receiver == app_addr, WRONG_PAYMENT_RECEIVER
        assert pay_mbr.rekey_to == Global.zero_address, WRONG_RE_KEY_TO
        pre_mbr = app_addr.min_balance
        # retrieve ticket type
        tt_key = self.box_key_from_uint64(
            Bytes(TICKET_TYPES_BOX_PREFIX), ticket_type_index
        )
        tt = self.read_ticket_type_box(tt_key)
        # length match
        assert (
            number_tickets == seats.length
        ), "number of tickets must equal to seats array length"
        # no over supply
        supply = tt.supply.native
        sold = tt.sold_amount.native
        assert sold + number_tickets <= supply, OVER_SUPPLY
        # ensure ops
        # budget approx => [fixed cost 600] + [variable cost 200] * tickets
        budget_approx = (sold + number_tickets) * 200 + 600
        ensure_budget(budget_approx, fee_source=OpUpFeeSource.GroupCredit)
        # no over max per user
        ob_key = self.box_key_from_address(Bytes(OWNER_BOX_PREFIX), owner)
        ob_res = self.read_owner_box(ob_key)
        count = number_tickets
        if ob_key[1] == Bytes(b"1"):
            count += ob_res[0].bought_tickets[ticket_type_index].native
        assert count <= tt.max_per_user, OVER_MAX_PER_USER
        # seat not taken
        s_key = self.box_key_from_uint64(Bytes(SEATS_BOX_PREFIX), ticket_type_index)
        is_taken = self.seats_contains(s_key, seats)
        assert not is_taken, SEAT_TAKEN
        # proceed to sell tickets
        # create asas
        ab_key = self.box_key_from_uint64(Bytes(ASSETS_BOX_PREFIX), ticket_type_index)
        assets = AssetsArray()
        for i in urange(number_tickets):
            seat = seats[i].copy()
            asset_id = self.execute_asset_creation_txn(
                tt.url.native, tt.metadata_hash.copy(), seat
            )
            # append to box
            assets.append(arc4.UInt64(asset_id))
        # append to assets box
        self.append_assets_to_box(ab_key, assets)
        # append to seats box
        self.append_seats_box(s_key, seats)
        # append to user box
        # please use "fix-arc4-dynamic-element-read" branch from puy_api github repo
        self.update_owner_box(ob_key, ticket_type_index, seats, assets)
        # update tickets sold
        self.update_sold_tickets(tt_key, tt, number_tickets)
        # ensure amount and mbr
        seats_cost = number_tickets * tt.price.native
        assert pay_asset.xfer_asset == self.usdc_asset, WRONG_ASSET_ID
        assert pay_asset.asset_amount >= seats_cost, ASSET_PAYMENT_TOO_LOW
        assert pay_asset.asset_receiver == app_addr, WROMG_ASSET_RECEIVER
        assert pay_asset.rekey_to == Global.zero_address, WRONG_RE_KEY_TO
        post_mbr = Global.current_application_address.min_balance
        pay_amount = post_mbr - pre_mbr
        # in case native algo payment 
        # pay_amount = post_mbr - pre_mbr + seats_cost
        assert pay_mbr.amount >= pay_amount, WRONG_PAYMENT_AMOUNT

    @arc4.abimethod
    def claim_asset(self, owner: Account, asset_id: UInt64) -> None:
        self.update_status()
        # check owner is correct
        is_owner = self.check_owner_asset(owner, asset_id)
        assert is_owner, NOT_ASSET_OWNER
        # transfer asset
        app_addr = Global.current_application_address
        itxn.AssetTransfer(
            asset_amount=1,
            xfer_asset=asset_id,
            sender=app_addr,
            asset_receiver=owner,
            fee=0,
        ).submit()
        return
    
    @arc4.abimethod
    def freeze_asset(self, owner: Account, asset_id: UInt64, seat: Bytes32) -> None:
        # only event owner
        assert Txn.sender == self.event_owner.value, ONLY_EVENT_OWNER
        # app_addr = Global.current_application_address
        itxn.AssetFreeze(
            freeze_asset=asset_id,
            frozen=True,
            freeze_account=owner,
            fee=0,
        ).submit()
        return

    @arc4.abimethod
    def un_freeze_asset(self, owner: Account, asset_id: UInt64, seat: Bytes32) -> None:
        self.update_status()
        # event ended 
        assert self.event_status == UInt64(ENDED), EVENT_NOT_ENDED
        # check owner is correct
        is_owner = self.check_owner_asset(owner, asset_id)
        assert is_owner, NOT_ASSET_OWNER
        # app_addr = Global.current_application_address
        itxn.AssetFreeze(
            freeze_asset=asset_id,
            frozen=False,
            freeze_account=owner,
            fee=0,
        ).submit()
        return

    @arc4.abimethod
    def withdraw(self) -> None:
        self.update_status()
        assert self.event_status == UInt64(ENDED), EVENT_NOT_ENDED
        app_addr = Global.current_application_address
        amount = app_addr.balance - app_addr.min_balance
        itxn.Payment(
            amount=amount,
            receiver=self.event_owner.value,
            sender=app_addr,
            fee=0,
        ).submit()
        app_asset_bal = self.usdc_asset.balance(app_addr)
        itxn.AssetTransfer(
            xfer_asset=self.usdc_asset,
            sender=app_addr,
            asset_receiver=self.event_owner.value,
            asset_amount=app_asset_bal,
        ).submit()
        return

    #######################
    # status subroutines  #
    #######################
    @subroutine
    def update_status(self) -> None:
        now = Global.latest_timestamp
        if now > self.event_end.value:
            self.update_to(UInt64(ENDED))
            return

        if now >= self.event_begin.value:
            self.update_to(UInt64(ON_GOING))
            return

    @subroutine
    def update_to(self, new_status: UInt64) -> None:
        old_status = self.event_status
        if old_status != new_status:
            self.event_status = new_status
            log(APP_STATUS_UPDATE, old_status, "to", new_status, sep=" ")

    @subroutine
    def check_status(self, status: UInt64) -> None:
        assert self.event_status == status, WRONG_STATUS

    @subroutine
    def check_status_not_ended(self) -> None:
        self.update_status()
        assert self.event_status != UInt64(ENDED), EVENT_ENDED

    ###################
    # box subroutines #
    ###################
    # general
    @subroutine
    def box_key_from_uint64(self, prefix: Bytes, index: UInt64) -> Bytes:
        return op.concat(prefix, op.itob(index))

    @subroutine
    def box_key_from_address(self, prefix: Bytes, acc: Account) -> Bytes:
        return op.concat(prefix, acc.bytes)

    # ticket types
    @subroutine
    def create_ticket_type_box(self, index: UInt64, tt: TicketsType) -> None:
        key = self.box_key_from_uint64(Bytes(TICKET_TYPES_BOX_PREFIX), index)
        op.Box.put(key, tt.bytes)

    @subroutine
    def read_ticket_type_box(self, key: Bytes) -> TicketsType:
        b_value = op.Box.get(key)
        assert b_value[1], BOX_GET_ERROR
        value = TicketsType.from_bytes(b_value[0])
        return value

    @subroutine
    def update_sold_tickets(
        self, key: Bytes, tt: TicketsType, amount_to_add: UInt64
    ) -> None:
        old_amount = tt.sold_amount.native
        new_amount = old_amount + amount_to_add
        tt.sold_amount = arc4.UInt64(new_amount)
        op.Box.replace(key, 0, tt.bytes)

    # owner box
    @subroutine
    def create_owner_box(self, owner: Account, ob: OwnerBox) -> None:
        key = self.box_key_from_address(Bytes(OWNER_BOX_PREFIX), owner)
        op.Box.put(key, ob.bytes)

    @subroutine
    def read_owner_box(self, key: Bytes) -> tuple[OwnerBox, bool]:
        b_value = op.Box.get(key)
        # assert b_value[1] == True, BOX_GET_ERROR
        value = OwnerBox.from_bytes(b_value[0])
        return (value.copy(), b_value[1])

    @subroutine
    def replace_owner_box(self, key: Bytes, ob: OwnerBox) -> None:
        op.Box.delete(key)
        op.Box.put(key, ob.bytes)

    @subroutine
    def update_owner_box(
        self,
        key: Bytes,
        ticket_type_index: UInt64,
        seats: SeatsArray,
        assets_ids: AssetsArray,
    ) -> None:
        assert seats.length == assets_ids.length, "lengths must match"
        b_owner = op.Box.get(key)
        if not b_owner[1]:
            b_t = BoughtTicketsArray()
            for _i in urange(self.last_type_index):
                b_t.append(arc4.UInt64(0))
            b_t[ticket_type_index] = arc4.UInt64(seats.length)
            _box = OwnerBox(seats=seats, assets=assets_ids, bought_tickets=b_t)
            op.Box.put(key, _box.bytes)
        else:
            _box = OwnerBox.from_bytes(b_owner[0])
            b_t = _box.bought_tickets.copy()
            prev_b_t = b_t[ticket_type_index]
            b_t[ticket_type_index] = arc4.UInt64(seats.length + prev_b_t.native)
            _s = _box.seats.copy()
            _s.extend(seats)
            _a = _box.assets.copy()
            _a.extend(assets_ids)
            _new_box = OwnerBox(seats=_s, assets=_a, bought_tickets=b_t)
            op.Box.delete(key)
            op.Box.put(key, _new_box.bytes)

    # Seats
    # seats = mapping(uint type_index => address[])
    @subroutine
    def create_seats_box(self, type_index: UInt64, seats: SeatsArray) -> None:
        key = self.box_key_from_uint64(Bytes(SEATS_BOX_PREFIX), type_index)
        op.Box.put(key, seats.bytes)

    @subroutine
    def read_seats_box(self, key: Bytes) -> tuple[SeatsArray, bool]:
        b_value = op.Box.get(key)
        # assert b_value[1] == True, BOX_GET_ERROR
        value = SeatsArray.from_bytes(b_value[0])
        return (value.copy(), b_value[1])

    @subroutine
    def replace_seats_box(self, key: Bytes, seats: SeatsArray) -> None:
        op.Box.delete(key)
        op.Box.put(key, seats.bytes)

    @subroutine
    def append_seats_box(self, key: Bytes, seats: SeatsArray) -> None:
        b_seats = op.Box.get(key)
        if not b_seats[1]:
            op.Box.put(key, seats.bytes)
        else:
            arr = SeatsArray.from_bytes(b_seats[0])
            arr.extend(seats)
            # TODO change to resize ???
            op.Box.delete(key)
            op.Box.put(key, arr.bytes)

    @subroutine
    def seats_contains(self, key: Bytes, ref_seats: SeatsArray) -> bool:
        r_seats = op.Box.get(key)
        if not r_seats[1]:
            return False
        value = SeatsArray.from_bytes(r_seats[0])
        for i in urange(value.length):
            s = value[i].copy()
            for j in urange(ref_seats.length):
                r_s = ref_seats[j].copy()
                if s == r_s:
                    return True
        return False

    # Assets box
    # assets = mapping(uint type_index => asset_id[])
    @subroutine
    def create_assets_box(self, type_index: UInt64, assets_ids: AssetsArray) -> None:
        key = self.box_key_from_uint64(Bytes(ASSETS_BOX_PREFIX), type_index)
        op.Box.put(key, assets_ids.bytes)

    @subroutine
    def read_assets_box(self, key: Bytes) -> tuple[AssetsArray, bool]:
        b_value = op.Box.get(key)
        # assert b_value[1] == True, BOX_GET_ERROR
        value = AssetsArray.from_bytes(b_value[0])
        return (value.copy(), b_value[1])

    @subroutine
    def replace_asset_box(self, key: Bytes, assets_ids: AssetsArray) -> None:
        op.Box.delete(key)
        op.Box.put(key, assets_ids.bytes)

    @subroutine
    def append_assets_to_box(self, key: Bytes, assets_ids: AssetsArray) -> None:
        b_assets = op.Box.get(key)
        if not b_assets[1]:
            op.Box.put(key, assets_ids.bytes)
        else:
            arr = AssetsArray.from_bytes(b_assets[0])
            arr.extend(assets_ids)
            op.Box.delete(key)
            op.Box.put(key, arr.bytes)

    ###################
    # Asa subroutines #
    ###################
    @subroutine
    def execute_asset_creation_txn(
        self, uri: String, metadata_hash: Bytes32, seat_as_addr: Bytes32
    ) -> UInt64:
        app_addr = Global.current_application_address
        asset_itxn = itxn.AssetConfig(
            asset_name=b"Event NFT",
            unit_name=b"EVT-TCK",
            total=1,
            decimals=0,
            manager=app_addr,
            reserve=Account.from_bytes(seat_as_addr.bytes),
            clawback=app_addr,
            default_frozen=False,
            url=uri,
            metadata_hash=metadata_hash.bytes,
            fee=0,
        ).submit()
        return asset_itxn.created_asset.id

    @subroutine
    def check_owner_asset(self, owner: Account, asset_id: UInt64) -> bool:
        ob_key = self.box_key_from_address(Bytes(OWNER_BOX_PREFIX), owner)
        ob_res = self.read_owner_box(ob_key)
        assert ob_res[1], USER_DOESNT_EXIST
        assets = ob_res[0].assets.copy()
        found = False
        for i in urange(assets.length):
            if assets[i] == asset_id:
                found = True
                break
        return found


######################
# Global subroutines #
######################
@subroutine
def security_checks(txn_number: UInt64) -> None:
    assert Global.group_size == txn_number, WRONG_GROUP_SIZE
    assert Txn.rekey_to == Global.zero_address, WRONG_RE_KEY_TO
