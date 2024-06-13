from algopy import (
    ARC4Contract,
    arc4,
    UInt64,
    log,
    itxn,
    OnCompleteAction,
    subroutine,
    op,
    Bytes,
    Account,
    Txn,
    gtxn,
    Global,
)

# import base64
# ref = "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"
# APPROVAL_BYTES = base64.b64decode(ref)
APPROVAL_BYTES =b'\n \t\x00\x01\x08 \x02\x04\x03\x06\x05&\x0e\x0cevent_status\x00\x0bevent_owner\nusdc_asset\x0flast_type_index\x0bevent_begin\tevent_end\x04name\x03tt-\x01 \x03ot-\x02\x00\x00\x03\x06\x81\x01\x02\x00\x061\x18@\x00\x03\x88\x0891\x1bA\x00\xff\x80\x04B\x90\xfa\xb4\x80\x04\xd2x:\x89\x80\x04m\x95t\x87\x80\x04\xe79\x06\xf9\x80\x04q@\xc2S\x80\x04\xb75_\xd16\x1a\x00\x8e\x06\x00\x01\x00C\x00v\x00\x8c\x00\xa5\x00\xbe\x001\x19\x14D1\x18D6\x1a\x01W\x02\x006\x1a\x02\x17\xc0\x1c6\x1a\x03\x17\xc006\x1a\x04\x176\x1a\x05\x176\x1a\x066\x1a\x076\x1a\x086\x1a\t6\x1a\n6\x1a\x0b1\x16#\tI8\x10#\x12D\x88\x00\x93#C1\x19\x14D1\x18D6\x1a\x01\x17\xc0\x1c6\x1a\x02\x176\x1a\x03\x176\x1a\x041\x16!\x04\tI8\x10#\x12D1\x16#\tI8\x10!\x05\x12D\x88\x02\t#C1\x19\x14D1\x18D6\x1a\x01\x17\xc0\x1c6\x1a\x02\x17\x88\x06X#C1\x19\x14D1\x18D6\x1a\x01\x17\xc0\x1c6\x1a\x02\x176\x1a\x03\x88\x06\xb8#C1\x19\x14D1\x18D6\x1a\x01\x17\xc0\x1c6\x1a\x02\x176\x1a\x03\x88\x06\xbf#C1\x19\x14D1\x18D\x88\x06\xde#C1\x19\x14D1\x18\x14D#C\x8a\x0c\x00)!\x04\x88\x01%2\n\x8b\xff8\x07K\x01\x12D\x8b\xff8 2\x03\x12DIs\x01LN\x02D"(eD\x14D\x8b\xf52\x03\x13D*\x8b\xf5g\xb1I\xb2\x00\xb2\x14"\xb2\x12\x8b\xf6\xb2\x11!\x05\xb2\x10"\xb2\x01\xb3+\x8b\xf6g2\x07\x81\xc0\xd1\x02\x08\x8b\xf7\x0cD\x8b\xf7\x81\x80\xa3\x05\x08\x8b\xf8\x0cD\'\x05\x8b\xf7g\'\x06\x8b\xf8g\x8b\xf9"Y"\x8b\x03\x8b\x02\x0cI\x8c\x00A\x00u\x8b\xf9W\x02\x00\x8b\x00D\x8b\x03IN\x02!\x04\x0bK\x01LYJY!\x04\x08XL\x8b\xfaW\x02\x00K\x01%\x0b%XL\x8b\xfbW\x02\x00K\x01$\x0bIN\x02$XL\x8b\xfcW\x02\x00K\x01$XL\x8b\xfdW\x02\x00K\x01$XL\x8b\xfeW\x02\x00L$X\x80\x02\x00BO\x06PO\x04PO\x03PO\x02PLPO\x02PK\x01L\x88\x00VH#\x08\x8c\x03B\xff\x80\'\x07\x8b\xf4g"\'\x04eD\x8b\x02\x08\'\x04Lg#\x88\x00T2\ns\x01D\x8b\x01\t\x8b\xff8\x08\x12D\x80\x17[EVENT MANAGER] Started\xb0\x89\x8a\x01\x002\x04\x8b\xff\x12D1 2\x03\x12D\x89\x8a\x02\x01\'\x08\x8b\xfe\x88\x00\x06\x8b\xff\xbf\x8b\xff\x89\x8a\x02\x01\x8b\xff\x16\x8b\xfeLP\x89\x8a\x01\x00"(eLIO\x02D\x8b\xff\x13A\x00>(\x8b\xffg\x8b\x00\x16\x80#[EVENT MANGER] Status Updated from LP\'\tP\x80\x02toP\'\tP\x8b\xff\x16P\xb0\x89\x8a\x06\x00"G\x02)!\x06\x88\xffy\x88\x01_2\nI\x8b\xfe8\x07K\x01\x12D\x8b\xfe8 2\x03\x12Ds\x01D\'\x08\x8b\xfc\x88\xffyI\x88\x01tI\x8b\xfd"Y\x8b\xfb\x12DIW*\x08\x17LW:\x08\x17\x8b\xfb\x08IO\x02\x0eD\x81\xc8\x01\x0b\x81\xd8\x04\x08"\x88\x01U\'\n\x8b\xfa\x88\x01\x89G\x02\x88\x01\x8dHLW\x01\x01\x80\x011\x12\x8b\xfbLA\x00\x1e\x8b\tI!\x05YLI\x15LO\x02O\x02RW\x02\x00\x8b\xfc$\x0b$X\x17\x8b\xfb\x08\x8c\n\x8b\x07W2\x08\x8b\n\x16\xa7D\x80\x03sb-\x8b\xfc\x88\xff\x01I\x8c\x02\x8b\xfd\x88\x01K\x8c\xfd\x14D\x80\x03ab-\x8b\xfc\x88\xfe\xeb\x8c\x00\'\x0b\x8c\x01"\x8c\x03\x8b\x03\x8b\xfb\x0cA\x00F\x8b\xfdW\x02\x00\x8b\x03IN\x02%\x0b%X\x8b\x07I"YLI\x15LIO\x03O\x03RW\x02\x00LW\x02 O\x02\x88\x01zF\x02\x8b\x01W\x02\x00L\x16PI\x15$\n\x16W\x06\x00LP\x8c\x01#\x08\x8c\x03B\xff\xb2\x8b\x00\x8b\x01\x88\x01\x9d\x8b\x02\x8b\xfd\x88\x01\xc8\x8c\xfd\x8b\x08\x8b\xfc\x8b\xfdO\x03\x88\x01\xedH\x8c\xfd\x8b\x06\x8b\x07\x8b\xfb\x88\x03\x10W"\x08\x17\x8b\xfb\x0b\x8b\xff8\x11"+eD\x12D\x8b\xff8\x12\x0eD\x8b\xff8\x14\x8b\x04\x12D\x8b\xff8 2\x03\x12D2\ns\x01D\x8b\x05\t\x8b\xfe8\x08\x0eD\x89\x8a\x00\x00\x88\x00\t"(eD!\x06\x13D\x89\x8a\x00\x002\x07I"\'\x06eD\rA\x00\x06!\x06\x88\xfe\x1f\x89"\'\x05eD\x8b\x00\x0eA\x00\x06!\x04\x88\xfe\x0e\x89\x89\x8a\x01\x01\x8b\xff\xbeD\x89\x8a\x02\x00\x8b\xfe\x81\n\x08\x8b\x002\x0c\rA\x00*\xb1!\x07\xb2\x10!\x08\xb2\x19\'\x0c\xb2\x1e\'\x0c\xb2\x1f\x8b\xff\x8d\x02\x00\x03\x00\tB\x00\n"\xb2\x01B\x00\x042\x00\xb2\x01\xb3B\xff\xce\x89\x8a\x02\x01\x8b\xfe\x8b\xffP\x89\x8a\x01\x02\x8b\xff\xbe\x89\x8a\x02\x02")G\x03\x8b\xfe\xbe@\x00\x08"\x8b\xff\x8c\x01\x8c\x00\x89\x8b\x05"Y\x8c\x03"\x8c\x01\x8b\x01\x8b\x03\x0cA\x00I\x8b\x05W\x02\x00\x8b\x01%\x0b%X\x8c\x00\x8b\xff"Y\x8c\x04"\x8c\x02\x8b\x02\x8b\x04\x0cA\x00"\x8b\xffW\x02\x00\x8b\x02%\x0b%X\x8b\x00\x12A\x00\x08#\x8b\xff\x8c\x01\x8c\x00\x89\x8b\x02#\x08\x8c\x02B\xff\xd6\x8b\x01#\x08\x8c\x01B\xff\xaf"\x8b\xff\x8c\x01\x8c\x00\x89\x8a\x03\x032\n\xb1\x8b\xfe\xb2(\x8b\xfd\xb2\'"\xb2$I\xb2,\x8b\xff\xb2*\xb2)"\xb2##\xb2"\x80\x07EVT-TCK\xb2%\x80\tEvent NFT\xb2&!\x06\xb2\x10"\xb2\x01\xb3\xb4<\x8b\xfe\x8b\xff\x89\x8a\x02\x01\x8b\xfe\xbe@\x00\x08\x8b\xfe\x8b\xff\xbfB\x00\x1d\x8b\x00W\x02\x00\x8b\xffW\x02\x00PI\x15$\n\x16W\x06\x00LP\x8b\xfe\xbcH\x8b\xfeL\xbf\x8b\xffL\x89\x8a\x02\x01\x8b\xfe\xbe@\x00\x08\x8b\xfe\x8b\xff\xbfB\x00\x1d\x8b\x00W\x02\x00\x8b\xffW\x02\x00PI\x15%\n\x16W\x06\x00LP\x8b\xfe\xbcH\x8b\xfeL\xbf\x8b\xffL\x89\x8a\x04\x02")I\x8b\xfe"YI\x8b\xff"Y\x12D\x8b\xfc\xbe@\x00z\'\x0b\x8c\x00"\'\x04eL\x8c\x02D"\x8c\x01\x8b\x01\x8b\x02\x0cA\x00%\x8b\x00W\x02\x00\x80\x08\x00\x00\x00\x00\x00\x00\x00\x00PI\x15$\n\x16W\x06\x00LP\x8c\x00\x8b\x01#\x08\x8c\x01B\xff\xd3\x8b\x03\x16\x8b\x00I"Y\x8b\xfd\rD\x8b\xfd$\x0b!\x04\x08O\x02]\x8b\xfe\x15!\x07\x08I\x16W\x06\x02\'\rLPL\x8b\xff\x15\x08\x16W\x06\x02P\x8b\xfeP\x8b\xffPLP\x8b\xfcL\xbfB\x00\x95\x8b\x04I!\x05YLI\x15LIK\x03O\x03RIW\x02\x00\x8b\xfd$\x0bIN\x03$X\x17\x8b\x03\x08\x16K\x01"Y\x8b\xfd\rDO\x02!\x04\x08L]N\x02I"YLI!\x04YK\x01O\x03K\x02RW\x02\x00\x8b\xfeW\x02\x00PI\x15%\n\x16W\x06\x00LPN\x02O\x03RW\x02\x00\x8b\xffW\x02\x00PI\x15$\n\x16W\x06\x00LPK\x01\x15!\x07\x08I\x16W\x06\x02\'\rLPLK\x02\x15\x08\x16W\x06\x02PO\x02PLPLP\x8b\xfc\xbcH\x8b\xfcL\xbf\x8b\xfe\x8b\xff\x8c\x01\x8c\x00\x89\x8a\x03\x01\x8b\xfeW:\x08\x17\x8b\xff\x08\x16\x8b\xfeL\\:\x8c\xfe\x8b\xfd"\x8b\xfe\xbb\x8b\xfe\x89\x8a\x02\x00\x88\xfd\x12\x8b\xfe\x8b\xff\x88\x00\x1aD2\n\xb1\x8b\xfe\xb2\x14\xb2\x00\x8b\xff\xb2\x11#\xb2\x12!\x05\xb2\x10"\xb2\x01\xb3\x89\x8a\x02\x01)\'\n\x8b\xfe\x88\xfdP\x88\xfdVDI!\x04YLI!\x05YLO\x02O\x02RI"L"Y"\x8b\x04\x8b\x03\x0c\x8b\x02\x8c\x00A\x00!\x8b\x01W\x02\x00\x8b\x04$\x0b$X\x8b\xff\x16\xa8A\x00\x06#\x8c\x00B\x00\t\x8b\x04#\x08\x8c\x04B\xff\xd3\x89\x8a\x03\x001\x00"*eD\x12D\xb1\x8b\xfd\xb2.#\xb2/\x8b\xfe\xb2-!\x08\xb2\x10"\xb2\x01\xb3\x89\x8a\x03\x00\x88\xfcy"(eD!\x06\x12D\x8b\xfd\x8b\xfe\x88\xffyD\xb1\x8b\xfd\xb2."\xb2/\x8b\xfe\xb2-!\x08\xb2\x10"\xb2\x01\xb3\x89\x8a\x00\x00\x88\xfcN"(eD!\x06\x12D2\nIs\x00LN\x02DIs\x01DO\x02L\t\xb1"*eDK\x02\xb2\x00\xb2\x07\xb2\x08#\xb2\x10"\xb2\x01\xb3"+eDK\x01Lp\x00D\xb1"+eD"*eDO\x02\xb2\x12\xb2\x14\xb2\x11\xb2\x00!\x05\xb2\x10"\xb2\x01\xb3\x89\x8a\x00\x00\'\x07)g\'\x05"g\'\x06"g*2\x03g+"g("g\'\x04"g\x80\x17[EVENT MANAGER] Created\xb0\x89'
# import base64
# ref = "CoEBQw=="
# CLEAR_BYTES = base64.b64decode(ref)
CLEAR_BYTES = b"\n\x81\x01C"

FACTORY_APP_CREATED = "Event Factory created"

BOX_COST = 2500
PER_BYTE_COST = 400

DEFAULT_PREFIX_LEN = 3
# Event Manager box is a mapping from ["em-"][index: uint64] => [app_id: uint64]
EVENT_MANAGER_BOX_PREFIX = b"em-"
EVENT_MANAGER_BOX_MBR = BOX_COST + PER_BYTE_COST * (DEFAULT_PREFIX_LEN + 8 + 8)
# Event Manager creator box is a mapping from ["ce-"][app_id: uint64] => [address: 32bytes]
EVENT_MANAGER_CREATOR_BOX_PREFIX = b"ce-"
EVENT_MANAGER_CREATOR_BOX_MBR = BOX_COST + PER_BYTE_COST * (DEFAULT_PREFIX_LEN + 8 + 32)

EVENT_CREATION_FEE = 2_000_000


class EventFactory(ARC4Contract):
    def __init__(self) -> None:
        self.last_event_manager = UInt64(0)
        self.factory_owner = Txn.sender
        log(FACTORY_APP_CREATED)

    @arc4.abimethod
    def create_event_manager(self, pay: gtxn.PaymentTransaction) -> UInt64:
        security_checks(UInt64(2))
        assert (
            pay.amount
            >= EVENT_CREATION_FEE
            + EVENT_MANAGER_BOX_MBR
            + EVENT_MANAGER_CREATOR_BOX_MBR
        ), "Min fee of 2 algos + mbr on event creation"
        app_addr = Global.current_application_address
        response = itxn.ApplicationCall(
            approval_program=APPROVAL_BYTES,
            clear_state_program=CLEAR_BYTES,
            global_num_bytes=2,
            global_num_uint=5,
            local_num_bytes=0,
            local_num_uint=0,
            on_completion=OnCompleteAction.NoOp,
            fee=0,
            extra_program_pages=1,
        ).submit()
        log(
            "Create manager: event",
            response.created_app.id,
            "from",
            Txn.sender,
            sep=" ",
        )
        itxn.Payment(
            amount=1_000_000,
            receiver=response.created_app.address,
            sender=app_addr,
            fee=0,
        ).submit()
        log("Transfered 0.1 Algos to", response.created_app.address, sep=" ")
        self.add_event_manager_boxes(response.created_app.id, Txn.sender)
        self.last_event_manager += 1
        return response.created_app.id
    
    @arc4.abimethod
    def withdraw(self) -> None:
        app_addr = Global.current_application_address
        amount = app_addr.balance - app_addr.min_balance
        itxn.Payment(
            amount=amount,
            receiver=self.factory_owner,
            sender=app_addr,
            fee=0,
        ).submit()
        return

    ################
    # Box handlers #
    ################
    # general
    @subroutine
    def box_key_from_uint64(self, prefix: Bytes, index: UInt64) -> Bytes:
        return op.concat(prefix, op.itob(index))

    @subroutine
    def box_key_from_address(self, prefix: Bytes, acc: Account) -> Bytes:
        return op.concat(prefix, acc.bytes)

    # boxes
    @subroutine
    def add_event_manager_boxes(self, app_id: UInt64, creator: Account) -> None:
        key_event = self.box_key_from_uint64(
            Bytes(EVENT_MANAGER_BOX_PREFIX), self.last_event_manager
        )
        key_creator = self.box_key_from_uint64(
            Bytes(EVENT_MANAGER_CREATOR_BOX_PREFIX), self.last_event_manager
        )
        op.Box.put(key_event, op.itob(app_id))
        op.Box.put(key_creator, creator.bytes)


######################
# Global subroutines #
######################
@subroutine
def security_checks(txn_number: UInt64) -> None:
    assert Global.group_size == txn_number, "Wrong group size"
    assert Txn.rekey_to == Global.zero_address, "Wrong rekey to"
